// script.js
const firebaseConfig = {
  apiKey: "AIzaSyCLMLmCEsLCvVgyN-W8kbUg8nSX-1ZzNMc",
  authDomain: "business-record-e7318.firebaseapp.com",
  projectId: "business-record-e7318",
  storageBucket: "business-record-e7318.firebasestorage.app",
  messagingSenderId: "545003299075",
  appId: "1:545003299075:web:74c86be434fa34f6288936"
};


// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();

// Global variables
let currentUser = null;
let salesRecords = [];
let editingRecordId = null;

// DOM elements
const authSection = document.getElementById('auth-section');
const appSection = document.getElementById('app-section');
const loginForm = document.getElementById('login-form');
const registerForm = document.getElementById('register-form');
const loginTab = document.getElementById('login-tab');
const registerTab = document.getElementById('register-tab');
const saleForm = document.getElementById('sale-form');
const editForm = document.getElementById('edit-form');
const editModal = document.getElementById('edit-modal');
const closeModal = document.getElementById('close-modal');
const cancelEdit = document.getElementById('cancel-edit');
const logoutBtn = document.getElementById('logout-btn');
const userNameSpan = document.getElementById('user-name');
const loadingDiv = document.getElementById('loading');
const messageDiv = document.getElementById('message');

// Initialize app
document.addEventListener('DOMContentLoaded', function() {
    initializeApp();
    setupEventListeners();
    setTodayDate();
});

// Initialize the application
function initializeApp() {
    auth.onAuthStateChanged(user => {
        if (user) {
            currentUser = user;
            showApp();
            // Add a small delay to ensure user is fully authenticated
            setTimeout(() => {
                loadUserData();
            }, 1000);
        } else {
            currentUser = null;
            showAuth();
        }
    });
}

// Setup event listeners
function setupEventListeners() {
    // Auth tab switching
    loginTab.addEventListener('click', () => showLoginForm());
    registerTab.addEventListener('click', () => showRegisterForm());
    
    // Auth forms
    loginForm.addEventListener('submit', handleLogin);
    registerForm.addEventListener('submit', handleRegister);
    
    // App functionality
    saleForm.addEventListener('submit', handleAddSale);
    editForm.addEventListener('submit', handleUpdateSale);
    logoutBtn.addEventListener('click', handleLogout);
    
    // Modal functionality
    closeModal.addEventListener('click', hideEditModal);
    cancelEdit.addEventListener('click', hideEditModal);
    editModal.addEventListener('click', (e) => {
        if (e.target === editModal) hideEditModal();
    });
}

// Set today's date as default
function setTodayDate() {
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('sale-date').value = today;
}

// Show/hide sections
function showAuth() {
    authSection.classList.remove('hidden');
    appSection.classList.add('hidden');
}

function showApp() {
    authSection.classList.add('hidden');
    appSection.classList.remove('hidden');
    if (currentUser) {
        userNameSpan.textContent = `Welcome, ${currentUser.displayName || currentUser.email}`;
    }
}

function showLoading() {
    loadingDiv.classList.remove('hidden');
}

function hideLoading() {
    loadingDiv.classList.add('hidden');
}

// Auth form switching
function showLoginForm() {
    loginTab.classList.add('active');
    registerTab.classList.remove('active');
    loginForm.classList.remove('hidden');
    registerForm.classList.add('hidden');
}

function showRegisterForm() {
    registerTab.classList.add('active');
    loginTab.classList.remove('active');
    registerForm.classList.remove('hidden');
    loginForm.classList.add('hidden');
}

// Show messages
function showMessage(text, type = 'success') {
    messageDiv.textContent = text;
    messageDiv.className = `message ${type}`;
    messageDiv.classList.remove('hidden');
    
    setTimeout(() => {
        messageDiv.classList.add('hidden');
    }, 3000);
}

// Authentication handlers
async function handleLogin(e) {
    e.preventDefault();
    
    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;
    
    showLoading();
    
    try {
        await auth.signInWithEmailAndPassword(email, password);
        showMessage('Login successful!');
        loginForm.reset();
    } catch (error) {
        console.error('Login error:', error);
        showMessage(getErrorMessage(error.code), 'error');
    } finally {
        hideLoading();
    }
}

async function handleRegister(e) {
    e.preventDefault();
    
    const name = document.getElementById('register-name').value;
    const email = document.getElementById('register-email').value;
    const password = document.getElementById('register-password').value;
    
    showLoading();
    
    try {
        const userCredential = await auth.createUserWithEmailAndPassword(email, password);
        
        // Update user profile with name
        await userCredential.user.updateProfile({
            displayName: name
        });
        
        // Create user document in Firestore
        await db.collection('users').doc(userCredential.user.uid).set({
            name: name,
            email: email,
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        
        showMessage('Registration successful!');
        registerForm.reset();
    } catch (error) {
        console.error('Registration error:', error);
        showMessage(getErrorMessage(error.code), 'error');
    } finally {
        hideLoading();
    }
}

async function handleLogout() {
    try {
        await auth.signOut();
        showMessage('Logged out successfully!');
        salesRecords = [];
        clearTable();
        updateDashboard();
    } catch (error) {
        console.error('Logout error:', error);
        showMessage('Error logging out', 'error');
    }
}

// Sales record handlers
async function handleAddSale(e) {
    e.preventDefault();
    
    if (!currentUser) return;
    
    const productName = document.getElementById('product-name').value;
    const quantity = parseInt(document.getElementById('quantity').value);
    const unitPrice = parseFloat(document.getElementById('unit-price').value);
    const saleDate = document.getElementById('sale-date').value;
    
    const saleRecord = {
        productName,
        quantity,
        unitPrice,
        total: quantity * unitPrice,
        saleDate,
        userId: currentUser.uid,
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
    };
    
    showLoading();
    
    try {
        await db.collection('sales').add(saleRecord);
        showMessage('Sale record added successfully!');
        saleForm.reset();
        setTodayDate();
        loadUserData(); // Refresh data
    } catch (error) {
        console.error('Error adding sale:', error);
        showMessage('Error adding sale record: ' + error.message, 'error');
    } finally {
        hideLoading();
    }
}

async function handleUpdateSale(e) {
    e.preventDefault();
    
    if (!currentUser || !editingRecordId) return;
    
    const productName = document.getElementById('edit-product-name').value;
    const quantity = parseInt(document.getElementById('edit-quantity').value);
    const unitPrice = parseFloat(document.getElementById('edit-unit-price').value);
    const saleDate = document.getElementById('edit-sale-date').value;
    
    const updatedRecord = {
        productName,
        quantity,
        unitPrice,
        total: quantity * unitPrice,
        saleDate,
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    };
    
    showLoading();
    
    try {
        await db.collection('sales').doc(editingRecordId).update(updatedRecord);
        showMessage('Sale record updated successfully!');
        hideEditModal();
        loadUserData(); // Refresh data
    } catch (error) {
        console.error('Error updating sale:', error);
        showMessage('Error updating sale record: ' + error.message, 'error');
    } finally {
        hideLoading();
    }
}

// Load user data from Firebase
async function loadUserData() {
    if (!currentUser) {
        console.log('No current user, skipping data load');
        return;
    }
    
    showLoading();
    
    try {
        // Wait for auth to be fully ready
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // Simple query without orderBy to avoid index requirements
        const snapshot = await db.collection('sales')
            .where('userId', '==', currentUser.uid)
            .get();
        
        salesRecords = [];
        snapshot.forEach(doc => {
            salesRecords.push({
                id: doc.id,
                ...doc.data()
            });
        });
        
        // Sort manually by date (most recent first)
        salesRecords.sort((a, b) => {
            if (a.createdAt && b.createdAt) {
                return b.createdAt.toDate() - a.createdAt.toDate();
            }
            return new Date(b.saleDate) - new Date(a.saleDate);
        });
        
        updateDashboard();
        renderTable();
    } catch (error) {
        console.error('Error loading data:', error);
        if (error.code === 'permission-denied') {
            showMessage('Permission denied. Please check your Firestore rules.', 'error');
        } else {
            showMessage('Error loading data: ' + error.message, 'error');
        }
    } finally {
        hideLoading();
    }
}

// Update dashboard statistics
function updateDashboard() {
    const totalProducts = salesRecords.reduce((sum, record) => sum + record.quantity, 0);
    const totalEarnings = salesRecords.reduce((sum, record) => sum + record.total, 0);
    const totalRecords = salesRecords.length;
    
    document.getElementById('total-products').textContent = totalProducts.toLocaleString();
    document.getElementById('total-earnings').textContent = `$${totalEarnings.toFixed(2)}`;
    document.getElementById('total-records').textContent = totalRecords.toLocaleString();
}

// Render sales records table
function renderTable() {
    const tbody = document.getElementById('records-tbody');
    tbody.innerHTML = '';
    
    if (salesRecords.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="6" style="text-align: center; color: #666; padding: 40px;">
                    No sales records found. Add your first sale record above!
                </td>
            </tr>
        `;
        return;
    }
    
    salesRecords.forEach(record => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${formatDate(record.saleDate)}</td>
            <td>${record.productName}</td>
            <td>${record.quantity}</td>
            <td>${record.unitPrice.toFixed(2)}</td>
            <td>${record.total.toFixed(2)}</td>
            <td>
                <div class="action-buttons">
                    <button class="btn btn-edit" onclick="editSale('${record.id}')">Edit</button>
                    <button class="btn btn-danger" onclick="deleteSale('${record.id}')">Delete</button>
                </div>
            </td>
        `;
        tbody.appendChild(row);
    });
}

// Edit sale record
function editSale(saleId) {
    const record = salesRecords.find(r => r.id === saleId);
    if (!record) return;
    
    editingRecordId = saleId;
    
    // Populate edit form
    document.getElementById('edit-product-name').value = record.productName;
    document.getElementById('edit-quantity').value = record.quantity;
    document.getElementById('edit-unit-price').value = record.unitPrice;
    document.getElementById('edit-sale-date').value = record.saleDate;
    
    showEditModal();
}

// Show/hide edit modal
function showEditModal() {
    editModal.classList.remove('hidden');
    document.body.style.overflow = 'hidden';
}

function hideEditModal() {
    editModal.classList.add('hidden');
    document.body.style.overflow = 'auto';
    editingRecordId = null;
    editForm.reset();
}

// Delete sale record
async function deleteSale(saleId) {
    if (!confirm('Are you sure you want to delete this record?')) return;
    
    showLoading();
    
    try {
        await db.collection('sales').doc(saleId).delete();
        showMessage('Record deleted successfully!');
        loadUserData(); // Refresh data
    } catch (error) {
        console.error('Error deleting sale:', error);
        showMessage('Error deleting record: ' + error.message, 'error');
    } finally {
        hideLoading();
    }
}

// Clear table
function clearTable() {
    document.getElementById('records-tbody').innerHTML = '';
}

// Utility functions
function formatDate(dateString) {
    const options = { year: 'numeric', month: 'short', day: 'numeric' };
    return new Date(dateString).toLocaleDateString(undefined, options);
}

function getErrorMessage(errorCode) {
    const errorMessages = {
        'auth/user-not-found': 'No account found with this email',
        'auth/wrong-password': 'Incorrect password',
        'auth/email-already-in-use': 'Email is already registered',
        'auth/weak-password': 'Password should be at least 6 characters',
        'auth/invalid-email': 'Invalid email address',
        'auth/too-many-requests': 'Too many failed attempts. Please try again later'
    };
    
    return errorMessages[errorCode] || 'An error occurred. Please try again.';
}

// Make functions globally available
window.deleteSale = deleteSale;
window.editSale = editSale;