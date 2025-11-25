
function doGet(e) {
  const lock = LockService.getScriptLock();
  lock.tryLock(30000);
  
  try {
    const action = e.parameter.action || '';
    
    switch (action) {
      case 'getCustomers':
        return getCustomers();
      case 'getOrders':
        return getOrders();
      case 'getPayments':
        return getPayments();
      case 'getDashboard':
        return getDashboardData();
      default:
        return createResponse({ status: 'error', message: 'Invalid action' });
    }
  } catch (error) {
    return createErrorResponse(error.toString());
  } finally {
    lock.releaseLock();
  }
}

function doPost(e) {
  const lock = LockService.getScriptLock();
  lock.tryLock(30000);
  
  try {
    const data = JSON.parse(e.postData.contents);
    const action = data.action;
    
    switch (action) {
      case 'saveCustomer':
        return saveCustomer(data.data);
      case 'updateCustomer':
        return updateCustomer(data.customerId, data.data);
      case 'deleteCustomer':
        return deleteCustomer(data.customerId);
      case 'saveOrder':
        return saveOrder(data.data);
      case 'savePayment':
        return savePayment(data.data);
      default:
        return createResponse({ status: 'error', message: 'Invalid action' });
    }
  } catch (error) {
    Logger.log('Error in doPost: ' + error.toString());
    return createErrorResponse(error.toString());
  } finally {
    lock.releaseLock();
  }
}


function getCustomers() {
  try {
    const sheet = getSheet('customers');
    const data = sheet.getDataRange().getDisplayValues();
    const customers = [];
    
    // Skip header row
    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      if (row[0]) { // If Customer ID exists
        customers.push({
          customerId: row[0],
          businessName: row[1],
          ownerName: row[2],
          phone: row[3],
          whatsappNumber: row[4] || row[3],
          ratePerItem: parseFloat(row[5]) || 0,
          address: row[6],
          notes: row[7],
          createdAt: row[8]
        });
      }
    }
    
    return createResponse({
      status: 'success',
      customers: customers,
      count: customers.length
    });
  } catch (error) {
    Logger.log('Error getting customers: ' + error.toString());
    return createErrorResponse(error.toString());
  }
}

function saveCustomer(customerData) {
  try {
    const sheet = getSheet('customers');
    
    const row = [
      customerData.customerId,
      customerData.businessName,
      customerData.ownerName,
      customerData.phone,
      customerData.whatsappNumber || customerData.phone,
      customerData.ratePerItem,
      customerData.address || '',
      customerData.notes || '',
      customerData.createdAt || new Date().toISOString()
    ];
    
    sheet.appendRow(row);
    
    return createResponse({
      status: 'success',
      message: 'Customer saved successfully'
    });
  } catch (error) {
    Logger.log('Error saving customer: ' + error.toString());
    return createErrorResponse(error.toString());
  }
}

function updateCustomer(customerId, customerData) {
  try {
    const sheet = getSheet('customers');
    const data = sheet.getDataRange().getDisplayValues();
    
    for (let i = 1; i < data.length; i++) {
      if (data[i][0] === customerId) {
        sheet.getRange(i + 1, 2).setValue(customerData.businessName);
        sheet.getRange(i + 1, 3).setValue(customerData.ownerName);
        sheet.getRange(i + 1, 4).setValue(customerData.phone);
        sheet.getRange(i + 1, 5).setValue(customerData.whatsappNumber || customerData.phone);
        sheet.getRange(i + 1, 6).setValue(customerData.ratePerItem);
        sheet.getRange(i + 1, 7).setValue(customerData.address || '');
        sheet.getRange(i + 1, 8).setValue(customerData.notes || '');
        
        return createResponse({
          status: 'success',
          message: 'Customer updated successfully'
        });
      }
    }
    
    return createErrorResponse('Customer not found');
  } catch (error) {
    Logger.log('Error updating customer: ' + error.toString());
    return createErrorResponse(error.toString());
  }
}

function deleteCustomer(customerId) {
  try {
    const sheet = getSheet('customers');
    const data = sheet.getDataRange().getDisplayValues();
    
    for (let i = 1; i < data.length; i++) {
      if (data[i][0] === customerId) {
        sheet.deleteRow(i + 1);
        return createResponse({
          status: 'success',
          message: 'Customer deleted successfully'
        });
      }
    }
    
    return createErrorResponse('Customer not found');
  } catch (error) {
    Logger.log('Error deleting customer: ' + error.toString());
    return createErrorResponse(error.toString());
  }
}

function getOrders() {
  try {
    const sheet = getSheet('orders');
    const data = sheet.getDataRange().getDisplayValues();
    const orders = [];
    
    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      if (row[0]) {
        orders.push({
          orderId: row[0],
          customerId: row[1],
          orderDate: row[2],
          itemCount: parseInt(row[3]) || 0,
          ratePerItem: parseFloat(row[4]) || 0,
          totalCharge: parseFloat(row[5]) || 0,
          paidAmount: parseFloat(row[6]) || 0,
          balance: parseFloat(row[7]) || 0,
          itemDescription: row[8],
          notes: row[9],
          createdAt: row[10]
        });
      }
    }
    
    return createResponse({
      status: 'success',
      orders: orders,
      count: orders.length
    });
  } catch (error) {
    Logger.log('Error getting orders: ' + error.toString());
    return createErrorResponse(error.toString());
  }
}

function saveOrder(orderData) {
  try {
    const sheet = getSheet('orders');
    
    const row = [
      orderData.orderId,
      orderData.customerId,
      orderData.orderDate,
      orderData.itemCount,
      orderData.ratePerItem,
      orderData.totalCharge,
      orderData.paidAmount || 0,
      orderData.balance,
      orderData.itemDescription || '',
      orderData.notes || '',
      orderData.createdAt || new Date().toISOString()
    ];
    
    sheet.appendRow(row);
    
    return createResponse({
      status: 'success',
      message: 'Order saved successfully'
    });
  } catch (error) {
    Logger.log('Error saving order: ' + error.toString());
    return createErrorResponse(error.toString());
  }
}

function getPayments() {
  try {
    const sheet = getSheet('payments');
    const data = sheet.getDataRange().getDisplayValues();
    const payments = [];
    
    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      if (row[0]) {
        payments.push({
          paymentId: row[0],
          orderId: row[1],
          customerId: row[2],
          amount: parseFloat(row[3]) || 0,
          mode: row[4],
          notes: row[5],
          timestamp: row[6],
          recordedBy: row[7]
        });
      }
    }
    
    return createResponse({
      status: 'success',
      payments: payments,
      count: payments.length
    });
  } catch (error) {
    Logger.log('Error getting payments: ' + error.toString());
    return createErrorResponse(error.toString());
  }
}

function savePayment(paymentData) {
  try {
    const paymentsSheet = getSheet('payments');
    const ordersSheet = getSheet('orders');
    
    const paymentRow = [
      paymentData.paymentId,
      paymentData.orderId,
      paymentData.customerId,
      paymentData.amount,
      paymentData.mode,
      paymentData.notes || '',
      paymentData.timestamp || new Date().toISOString(),
      paymentData.recordedBy || 'Staff'
    ];
    
    paymentsSheet.appendRow(paymentRow);
    
    const ordersData = ordersSheet.getDataRange().getDisplayValues();
    for (let i = 1; i < ordersData.length; i++) {
      if (ordersData[i][0] === paymentData.orderId) {
        const currentPaid = parseFloat(ordersData[i][6]) || 0;
        const newPaid = currentPaid + parseFloat(paymentData.amount);
        const totalCharge = parseFloat(ordersData[i][5]) || 0;
        const newBalance = totalCharge - newPaid;
        
        ordersSheet.getRange(i + 1, 7).setValue(newPaid); 
        ordersSheet.getRange(i + 1, 8).setValue(newBalance); 
        break;
      }
    }
    
    return createResponse({
      status: 'success',
      message: 'Payment recorded successfully'
    });
  } catch (error) {
    Logger.log('Error saving payment: ' + error.toString());
    return createErrorResponse(error.toString());
  }
}

function getDashboardData() {
  try {
    const customersData = getCustomers();
    const ordersData = getOrders();
    const paymentsData = getPayments();
    
    return createResponse({
      status: 'success',
      customers: JSON.parse(customersData.getContent()).customers,
      orders: JSON.parse(ordersData.getContent()).orders,
      payments: JSON.parse(paymentsData.getContent()).payments
    });
  } catch (error) {
    Logger.log('Error getting dashboard data: ' + error.toString());
    return createErrorResponse(error.toString());
  }
}


function getSheet(sheetName) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(sheetName);
  
  if (!sheet) {
    sheet = ss.insertSheet(sheetName);
    
    if (sheetName === 'customers') {
      sheet.appendRow(['Customer ID', 'Business Name', 'Owner Name', 'Phone', 'WhatsApp', 'Rate/Item', 'Address', 'Notes', 'Created At']);
    } else if (sheetName === 'orders') {
      sheet.appendRow(['Order ID', 'Customer ID', 'Order Date', 'Item Count', 'Rate/Item', 'Total Charge', 'Paid Amount', 'Balance', 'Item Description', 'Notes', 'Created At']);
    } else if (sheetName === 'payments') {
      sheet.appendRow(['Payment ID', 'Order ID', 'Customer ID', 'Amount', 'Mode', 'Notes', 'Timestamp', 'Recorded By']);
    }
    
    // Format header row
    const headerRange = sheet.getRange(1, 1, 1, sheet.getLastColumn());
    headerRange.setFontWeight('bold');
    headerRange.setBackground('#4285f4');
    headerRange.setFontColor('#ffffff');
  }
  
  return sheet;
}

function createResponse(data) {
  return ContentService.createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

function createErrorResponse(errorMessage) {
  return ContentService.createTextOutput(JSON.stringify({
    status: 'error',
    message: errorMessage
  })).setMimeType(ContentService.MimeType.JSON);
}

