import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PrintService } from './PrintService';
import { Bill, BillItem, RestaurantSettings } from '../types';

describe('PrintService - Direct Thermal Printing without Browser Preview or POS Minimization', () => {
  const sampleBill: Bill = {
    id: 'bill_015',
    billNumber: '015',
    businessDate: '2026-10-05',
    orderType: 'DINE_IN',
    priceType: 'NON_AC',
    tableNumber: 'T-02',
    subtotal: 240,
    discount: 0,
    grandTotal: 240,
    paymentMethod: 'CASH',
    paymentStatus: 'PAID',
    status: 'COMPLETED',
    reprintCount: 0,
    userId: 'cashier_1',
    userName: 'Cashier',
    createdAt: 1728000000000,
    updatedAt: 1728000000000
  };

  const sampleItems: BillItem[] = [
    {
      id: 'item_1',
      billId: 'bill_015',
      itemId: 'm1',
      itemCode: '101',
      itemName: 'Rice',
      itemNameTamil: 'Rice',
      quantity: 1,
      unitPrice: 160,
      totalPrice: 160,
      priceType: 'NON_AC',
      createdAt: 1728000000000
    },
    {
      id: 'item_2',
      billId: 'bill_015',
      itemId: 'm2',
      itemCode: '102',
      itemName: 'Juice',
      itemNameTamil: 'Juice',
      quantity: 1,
      unitPrice: 80,
      totalPrice: 80,
      priceType: 'NON_AC',
      createdAt: 1728000000000
    }
  ];

  const sampleSettings: RestaurantSettings = {
    restaurantName: 'SRI SARAVANA BHAVAN',
    address: 'No:8A, Rajambal Nagar, Salem Main Rd, Kallakurichi',
    phone: '7708159933',
    receiptFooter: 'THANK YOU',
    paperWidth: '80mm',
    receiptFontSize: 12,
    watermarkEnabled: true,
    watermarkUseLogo: true,
    boldRestaurantName: true,
    boldBillNumber: true,
    boldItemHeader: true,
    boldGrandTotal: true,
    boldFooter: true
  };

  beforeEach(() => {
    PrintService.clearPrintJobs();
    PrintService.setSimulatedPrinterState('READY');
    localStorage.removeItem('pos_local_print_bridge_url');
    delete (window as any).qz;
  });

  it('1-4. prints receipt via direct ESC/POS without calling window.print() or opening a popup window', async () => {
    const windowPrintSpy = vi.fn();
    Object.defineProperty(window, 'print', {
      value: windowPrintSpy,
      writable: true,
      configurable: true
    });
    const windowOpenSpy = vi.spyOn(window, 'open');

    const result = await PrintService.printReceipt({
      bill: sampleBill,
      items: sampleItems,
      settings: sampleSettings,
      forcePrint: true
    });

    expect(result.success).toBe(true);
    expect(result.escPosBytes).toBeGreaterThan(0);
    expect(result.job?.status).toBe('PRINTED');
    expect(result.job?.billNumber).toBe('015');
    expect(windowPrintSpy).not.toHaveBeenCalled();
    expect(windowOpenSpy).not.toHaveBeenCalled();
  });

  it('5-8. keeps POS screen active and preserves billing input focus during asynchronous print', async () => {
    const billingInput = document.createElement('input');
    billingInput.id = 'item-code-input';
    document.body.appendChild(billingInput);
    billingInput.focus();

    expect(document.activeElement).toBe(billingInput);

    const result = await PrintService.printReceipt({
      bill: sampleBill,
      items: sampleItems,
      settings: sampleSettings,
      forcePrint: true
    });

    expect(result.success).toBe(true);
    expect(document.activeElement).toBe(billingInput);
    expect(document.body.classList.contains('pos-printing')).toBe(false);

    document.body.removeChild(billingInput);
  });

  it('9. marks job as FAILED when printer is disconnected and retries the SAME bill without duplicating bills', async () => {
    PrintService.setSimulatedPrinterState('DISCONNECTED');

    const firstAttempt = await PrintService.printReceipt({
      bill: sampleBill,
      items: sampleItems,
      settings: sampleSettings,
      forcePrint: true
    });

    expect(firstAttempt.success).toBe(false);
    expect(firstAttempt.job?.status).toBe('FAILED');
    expect(firstAttempt.job?.billId).toBe('bill_015');
    expect(firstAttempt.job?.billNumber).toBe('015');
    expect(firstAttempt.job?.attempts).toBe(1);

    // Reconnect printer and retry the exact same bill & job
    PrintService.setSimulatedPrinterState('READY');

    const retryAttempt = await PrintService.printReceipt({
      bill: sampleBill,
      items: sampleItems,
      settings: sampleSettings,
      forcePrint: true,
      isRetry: true,
      jobId: firstAttempt.jobId
    });

    expect(retryAttempt.success).toBe(true);
    expect(retryAttempt.jobId).toBe(firstAttempt.jobId);
    expect(retryAttempt.job?.billId).toBe('bill_015');
    expect(retryAttempt.job?.billNumber).toBe('015');
    expect(retryAttempt.job?.status).toBe('PRINTED');
    expect(retryAttempt.job?.attempts).toBe(2);

    const jobsForBill = PrintService.getPrintJobs().filter((j) => j.billId === 'bill_015');
    expect(jobsForBill.length).toBe(1);
  });

  it('10. executes Test Print (TEST-001) via direct ESC/POS without calling window.print() or minimizing POS', async () => {
    const windowPrintSpy = vi.fn();
    Object.defineProperty(window, 'print', {
      value: windowPrintSpy,
      writable: true,
      configurable: true
    });
    const windowOpenSpy = vi.spyOn(window, 'open');

    const result = await PrintService.testPrint(sampleSettings);

    expect(result.success).toBe(true);
    expect(result.job?.billNumber).toBe('TEST-001');
    expect(result.job?.status).toBe('PRINTED');
    expect(windowPrintSpy).not.toHaveBeenCalled();
    expect(windowOpenSpy).not.toHaveBeenCalled();

    const printRoot = document.getElementById('pos-print-root');
    expect(printRoot?.getAttribute('data-print-mode')).toBe('DIRECT_ESCPOS');
    expect(printRoot?.innerHTML).toContain('TEST-001');
  });

  it('supports QZ Tray local print bridge when window.qz is available', async () => {
    const qzPrintSpy = vi.fn().mockResolvedValue(undefined);
    (window as any).qz = {
      websocket: {
        isActive: () => true,
        connect: vi.fn().mockResolvedValue(undefined)
      },
      printers: {
        getDefault: vi.fn().mockResolvedValue('EPSON_TM_T82')
      },
      configs: {
        create: vi.fn().mockReturnValue({ printer: 'EPSON_TM_T82' })
      },
      print: qzPrintSpy
    };

    const result = await PrintService.printReceipt({
      bill: sampleBill,
      items: sampleItems,
      settings: sampleSettings,
      forcePrint: true
    });

    expect(result.success).toBe(true);
    expect(result.channel).toBe('QZ_TRAY_ESCPOS');
    expect(qzPrintSpy).toHaveBeenCalledTimes(1);
  });
});
