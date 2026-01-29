/* 
 * COPY TO CODE.GS IN GOOGLE APPS SCRIPT EDITOR 
 */

// 1. SETUP FUNCTION (RUN ONCE)
function setup() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  
  // Create Users Sheet
  if (!ss.getSheetByName('Users')) {
    const sheet = ss.insertSheet('Users');
    // Header
    sheet.appendRow(['id', 'username', 'fullname', 'role', 'class']);
    // Default Data
    sheet.appendRow(['u1', 'admin', 'Quản Trị Viên', 'ADMIN', '']);
    sheet.appendRow(['u2', 'gv', 'Giáo Viên A', 'USER', '']);
    sheet.appendRow(['u3', 'hs', 'Học Sinh B', 'HS', '10A1']);
    sheet.appendRow(['u4', 'viewer', 'Bảo Vệ', 'VIEWER', '']);
  }
  
  // Create Data Sheet
  if (!ss.getSheetByName('Data')) {
    const sheet = ss.insertSheet('Data');
    sheet.appendRow(['id', 'studentName', 'class', 'reason', 'detail', 'fromDate', 'toDate', 'attachmentUrl', 'status', 'createdBy', 'createdAt']);
  }
  
  // Create Config Sheet
  if (!ss.getSheetByName('Config')) {
    const sheet = ss.insertSheet('Config');
    sheet.appendRow(['key', 'value']);
  }
}

// 2. SERVE HTML
function doGet() {
  return HtmlService.createHtmlOutputFromFile('index')
    .setTitle('EduLeave Manager')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL)
    .addMetaTag('viewport', 'width=device-width, initial-scale=1');
}

// 3. HELPER: SHEET INTERACTION
function getSheetData(sheetName) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(sheetName);
  if (!sheet) return [];
  
  const data = sheet.getDataRange().getValues();
  const headers = data.shift(); // Remove header row
  
  if (!headers) return []; // Empty sheet

  // Convert array to object based on headers
  return data.map(row => {
    let obj = {};
    headers.forEach((header, index) => {
      obj[header] = row[index];
    });
    return obj;
  });
}

function appendData(sheetName, dataObj) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(sheetName);
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  
  const row = headers.map(header => {
    return dataObj[header] || '';
  });
  
  sheet.appendRow(row);
  return true;
}

// 4. API FUNCTIONS (Called from React)

// Load initial config, users, and data
function api_loadAllConfigData() {
  const users = getSheetData('Users');
  const requests = getSheetData('Data');
  
  // Sort requests by createdAt desc (newest first)
  requests.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  return {
    users: users,
    requests: requests
  };
}

// Login
function api_login(username) {
  const users = getSheetData('Users');
  const user = users.find(u => u.username == username);
  
  if (user) {
    return { success: true, data: user };
  }
  return { success: false, message: 'Tên đăng nhập không đúng' };
}

// Create Request
function api_createRequest(data, userInfoStr) {
  try {
    const userInfo = JSON.parse(userInfoStr);
    const newId = 'REQ-' + new Date().getTime();
    
    const record = {
      id: newId,
      studentName: userInfo.role === 'HS' ? userInfo.fullname : (data.studentName || 'Unknown'),
      class: userInfo.role === 'HS' ? (userInfo.class || '') : (data.class || ''),
      reason: data.reason,
      detail: data.detail || '',
      fromDate: data.fromDate,
      toDate: data.toDate,
      attachmentUrl: data.attachmentUrl || '',
      status: 'Chờ duyệt',
      createdBy: userInfo.username,
      createdAt: new Date().toISOString()
    };
    
    appendData('Data', record);
    return { success: true, data: record };
  } catch (e) {
    return { success: false, message: e.toString() };
  }
}

// Update Request
function api_updateRequest(id, updates) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName('Data');
  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  const idIndex = headers.indexOf('id');
  
  let rowIndex = -1;
  for (let i = 1; i < data.length; i++) {
    if (data[i][idIndex] == id) {
      rowIndex = i + 1;
      break;
    }
  }
  
  if (rowIndex === -1) return { success: false, message: 'Not found' };
  
  Object.keys(updates).forEach(key => {
    const colIndex = headers.indexOf(key);
    if (colIndex > -1) {
      sheet.getRange(rowIndex, colIndex + 1).setValue(updates[key]);
    }
  });
  
  return { success: true };
}

// Delete Request
function api_deleteRequest(id) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName('Data');
  const data = sheet.getDataRange().getValues();
  const idIndex = data[0].indexOf('id');
  
  for (let i = 1; i < data.length; i++) {
    if (data[i][idIndex] == id) {
      sheet.deleteRow(i + 1);
      return { success: true };
    }
  }
  return { success: false, message: 'Not found' };
}

// Upload File (Base64)
function api_uploadFile(data, name, type) {
  try {
    const folderName = "EduLeave_Uploads";
    const folders = DriveApp.getFoldersByName(folderName);
    let folder;
    
    if (folders.hasNext()) {
      folder = folders.next();
    } else {
      folder = DriveApp.createFolder(folderName);
    }
      
    const blob = Utilities.newBlob(Utilities.base64Decode(data), type, name);
    const file = folder.createFile(blob);
    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    
    return file.getUrl();
  } catch (e) {
    return "Error: " + e.toString();
  }
}