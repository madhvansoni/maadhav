function doPost(e) {
  try {
    const lock = LockService.getScriptLock();
    lock.tryLock(10000);
    
    if (!lock.hasLock()) {
      return createErrorResponse('Could not obtain lock');
    }
    
    const data = JSON.parse(e.postData.contents);
    
    if (data.action === 'updateStatus') {
      const result = updateOrderStatus(data.orderId, data.status);
      lock.releaseLock();
      return result;
    }
    
    if (data.action === 'updateChocolateStatus') {
      const result = updateChocolateOrderStatus(data.orderId, data.status);
      lock.releaseLock();
      return result;
    }
    
    const sheetName = data.sheetName || 'Orders';
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    let sheet = ss.getSheetByName(sheetName);
    
    if (!sheet) {
      sheet = createSheet(ss, sheetName);
    }
    
    if (sheetName === 'chocolates_orders') {
      addChocolateOrder(sheet, data);
    } else {
      addFoodOrder(sheet, data);
    }
    
    lock.releaseLock();
    
    return ContentService.createTextOutput(JSON.stringify({
      'status': 'success',
      'success': true,
      'message': 'Order saved successfully',
      'orderId': data.orderId
    })).setMimeType(ContentService.MimeType.JSON);
    
  } catch (error) {
    Logger.log('Error in doPost: ' + error.toString());
    return createErrorResponse(error.toString());
  }
}

function doGet(e) {
  try {
    const params = e.parameter || {};
    const requestedSheet = params.sheet || '';
    const sheetName = (requestedSheet === 'chocolates_orders') ? 'chocolates_orders' : 'Orders';
    
    Logger.log('GET request - Requested sheet: ' + requestedSheet + ', Using sheet: ' + sheetName);
    
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(sheetName);
    
    if (!sheet) {
      return ContentService.createTextOutput(JSON.stringify({
        'status': 'success',
        'orders': [],
        'count': 0
      })).setMimeType(ContentService.MimeType.JSON);
    }
    
    const data = sheet.getDataRange().getDisplayValues();
    const orders = [];
    
    if (sheetName === 'chocolates_orders') {
      for (let i = 1; i < data.length; i++) {
        const row = data[i];
        orders.push({
          orderId: formatCellValue(row[0]),
          flatNumber: formatCellValue(row[1]),
          apartmentName: formatCellValue(row[2]),
          items: formatCellValue(row[3]),
          total: formatCellValue(row[4]),
          status: formatCellValue(row[5]) || 'Pending',
          timestamp: formatCellValue(row[6]),
          rowIndex: i + 1
        });
      }
    } else {
      for (let i = 1; i < data.length; i++) {
        const row = data[i];
        orders.push({
          orderId: formatCellValue(row[0]),
          deliveryDate: formatCellValue(row[1]),
          deliveryTime: formatCellValue(row[2]),
          flat: formatCellValue(row[3]),
          apartment: formatCellValue(row[4]),
          items: formatCellValue(row[5]),
          total: formatCellValue(row[6]),
          status: formatCellValue(row[7]) || 'Pending',
          timestamp: formatCellValue(row[8]),
          rowIndex: i + 1
        });
      }
    }
    
    orders.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    
    return ContentService.createTextOutput(JSON.stringify({
      'status': 'success',
      'orders': orders,
      'count': orders.length,
      'sheetUsed': sheetName
    })).setMimeType(ContentService.MimeType.JSON);
    
  } catch (error) {
    Logger.log('Error in doGet: ' + error.toString());
    return createErrorResponse(error.toString());
  }
}

function createSheet(spreadsheet, sheetName) {
  const sheet = spreadsheet.insertSheet(sheetName);
  
  if (sheetName === 'chocolates_orders') {
    sheet.appendRow([
      'Order ID',
      'Flat Number',
      'Apartment Name',
      'Items',
      'Total',
      'Status',
      'Timestamp'
    ]);
    
    const headerRange = sheet.getRange(1, 1, 1, 7);
    headerRange.setFontWeight('bold');
    headerRange.setBackground('#B19CD9');
    headerRange.setFontColor('#FFFFFF');
  } else {
    sheet.appendRow([
      'Order ID',
      'Delivery Date',
      'Delivery Time',
      'Flat',
      'Apartment',
      'Items',
      'Total',
      'Status',
      'Ordered At'
    ]);
    
    const headerRange = sheet.getRange(1, 1, 1, 9);
    headerRange.setFontWeight('bold');
    headerRange.setBackground('#ff6348');
    headerRange.setFontColor('#FFFFFF');
  }
  
  return sheet;
}

function addChocolateOrder(sheet, data) {
  sheet.appendRow([
    data.orderId || '',
    data.flatNumber || '',
    data.apartmentName || '',
    data.items || '',
    data.total || '',
    data.status || 'Pending',
    data.timestamp || new Date().toISOString()
  ]);
  
  sheet.autoResizeColumns(1, 7);
}
function addFoodOrder(sheet, data) {
  sheet.appendRow([
    data.orderId || '',
    data.date || '',
    data.time || '',
    data.flatNumber || '',
    data.apartmentName || '',
    data.items || '',
    data.total || '',
    'Pending',
    data.timestamp || new Date().toISOString()
  ]);
  
  sheet.autoResizeColumns(1, 9);
}

function updateOrderStatus(orderId, newStatus) {
  try {
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Orders');
    
    if (!sheet) {
      return createErrorResponse('Orders sheet not found');
    }
    
    const data = sheet.getDataRange().getDisplayValues();
    
    for (let i = 1; i < data.length; i++) {
      if (data[i][0] === orderId) {
        sheet.getRange(i + 1, 8).setValue(newStatus);
        
        return ContentService.createTextOutput(JSON.stringify({
          'status': 'success',
          'message': 'Status updated successfully'
        })).setMimeType(ContentService.MimeType.JSON);
      }
    }
    
    return createErrorResponse('Order not found');
    
  } catch (error) {
    Logger.log('Error updating status: ' + error.toString());
    return createErrorResponse(error.toString());
  }
}

function formatCellValue(value) {
  if (value === null || value === undefined || value === '') {
    return '';
  }
  return String(value).trim();
}

function updateChocolateOrderStatus(orderId, newStatus) {
  try {
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('chocolates_orders');
    
    if (!sheet) {
      return createErrorResponse('Chocolate orders sheet not found');
    }
    
    const data = sheet.getDataRange().getDisplayValues();
    
    for (let i = 1; i < data.length; i++) {
      if (data[i][0] === orderId) {
        sheet.getRange(i + 1, 6).setValue(newStatus);
        
        return ContentService.createTextOutput(JSON.stringify({
          'status': 'success',
          'message': 'Status updated successfully'
        })).setMimeType(ContentService.MimeType.JSON);
      }
    }
    
    return createErrorResponse('Order not found');
    
  } catch (error) {
    Logger.log('Error updating chocolate status: ' + error.toString());
    return createErrorResponse(error.toString());
  }
}

function createErrorResponse(errorMessage) {
  return ContentService.createTextOutput(JSON.stringify({
    'status': 'error',
    'success': false,
    'error': errorMessage,
    'message': errorMessage
  })).setMimeType(ContentService.MimeType.JSON);
}

