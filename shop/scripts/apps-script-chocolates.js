
function doPost(e) {
  try {
    const lock = LockService.getScriptLock();
    lock.tryLock(10000);
    
    if (!lock.hasLock()) {
      return ContentService.createTextOutput(JSON.stringify({
        'success': false,
        'error': 'Could not obtain lock'
      })).setMimeType(ContentService.MimeType.JSON);
    }
    
    const data = JSON.parse(e.postData.contents);
    const sheetName = data.sheetName || 'chocolates_orders';
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    let sheet = ss.getSheetByName(sheetName);
    
    if (!sheet) {
      sheet = ss.insertSheet(sheetName);
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
    }
    
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
    lock.releaseLock();
    
    return ContentService.createTextOutput(JSON.stringify({
      'success': true,
      'orderId': data.orderId
    })).setMimeType(ContentService.MimeType.JSON);
    
  } catch (error) {
    Logger.log('Error: ' + error.toString());
    return ContentService.createTextOutput(JSON.stringify({
      'success': false,
      'error': error.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

function doGet(e) {
  return ContentService.createTextOutput(JSON.stringify({
    'status': 'active',
    'message': 'Little Treat Chocolate Orders API is running'
  })).setMimeType(ContentService.MimeType.JSON);
}

