// Firebase Configuration
const firebaseConfig = {
  apiKey: "AIzaSyCL2TxPE8MJDRsk1BJ5YV1r8t3e2ETLINc",
  authDomain: "blog-webapp-fd909.firebaseapp.com",
  projectId: "blog-webapp-fd909",
  storageBucket: "blog-webapp-fd909.firebasestorage.app",
  messagingSenderId: "339403794168",
  appId: "1:339403794168:web:916f655a09e1323d957d0d"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();
const auth = firebase.auth();

// Global Variables
let currentUser = null;
let editingBlogId = null;
let allBlogs = [];

// DOM Content Loaded
document.addEventListener('DOMContentLoaded', function() {
    showSection('home');
    loadBlogs();
    setupSearchListener();
    setupFormListeners();
    
    // Auth state observer
    auth.onAuthStateChanged(user => {
        currentUser = user;
        if (user) {
            document.getElementById('adminDashboard').style.display = 'block';
            closeModal('adminModal');
            loadAdminBlogs();
            showNotification('Welcome back, Admin!');
        } else {
            document.getElementById('adminDashboard').style.display = 'none';
        }
    });
});

// Navigation Functions
function showSection(sectionName) {
    // Hide all sections
    const sections = ['home', 'blogs', 'about', 'adminDashboard'];
    sections.forEach(section => {
        document.getElementById(section).style.display = 'none';
    });
    
    // Show selected section
    document.getElementById(sectionName).style.display = 'block';
    
    // Update navigation
    document.querySelectorAll('.nav-link').forEach(link => {
        link.classList.remove('active');
    });
    
    if (sectionName !== 'adminDashboard') {
        const activeLink = document.querySelector(`[onclick="showSection('${sectionName}')"]`);
        if (activeLink) activeLink.classList.add('active');
    }
    
    // Load blogs if blogs section is shown
    if (sectionName === 'blogs') {
        loadBlogs();
    }
}

function toggleMobileMenu() {
    const navMenu = document.querySelector('.nav-menu');
    navMenu.classList.toggle('active');
}

// Blog Functions
async function loadBlogs() {
    const container = document.getElementById('blogsContainer');
    const loading = document.getElementById('loadingSpinner');
    const noBlogs = document.getElementById('noBlogsMessage');
    
    loading.style.display = 'block';
    container.innerHTML = '';
    noBlogs.style.display = 'none';
    
    try {
        const snapshot = await db.collection('blogs')
            .orderBy('createdAt', 'desc')
            .get();
        
        allBlogs = [];
        
        if (snapshot.empty) {
            loading.style.display = 'none';
            noBlogs.style.display = 'block';
            return;
        }
        
        snapshot.forEach(doc => {
            const blog = { id: doc.id, ...doc.data() };
            allBlogs.push(blog);
        });
        
        displayBlogs(allBlogs);
        loading.style.display = 'none';
        
    } catch (error) {
        console.error('Error loading blogs:', error);
        loading.style.display = 'none';
        showNotification('Error loading blogs', 'error');
    }
}

function displayBlogs(blogs) {
    const container = document.getElementById('blogsContainer');
    container.innerHTML = '';
    
    blogs.forEach(blog => {
        const blogCard = createBlogCard(blog);
        container.appendChild(blogCard);
    });
}

function createBlogCard(blog) {
    const card = document.createElement('div');
    card.className = 'blog-card';
    card.onclick = () => openBlogDetail(blog);
    
    const imageUrl = blog.imageUrl || 'https://via.placeholder.com/400x200/667eea/ffffff?text=Blog+Image';
    const excerpt = blog.content.length > 150 ? blog.content.substring(0, 150) + '...' : blog.content;
    const date = blog.createdAt ? new Date(blog.createdAt.toDate()).toLocaleDateString() : 'Unknown date';
    
    card.innerHTML = `
        <img src="${imageUrl}" alt="${blog.title}" class="blog-image" 
             onerror="this.src='https://via.placeholder.com/400x200/667eea/ffffff?text=Blog+Image'">
        <div class="blog-content">
            <h3 class="blog-title">${blog.title}</h3>
            <p class="blog-excerpt">${excerpt}</p>
            <div class="blog-meta">
                <span class="blog-author">By ${blog.author}</span>
                <span class="blog-date">${date}</span>
            </div>
        </div>
    `;
    
    return card;
}

function openBlogDetail(blog) {
    const modal = document.getElementById('blogModal');
    const content = document.getElementById('blogModalContent');
    
    const imageUrl = blog.imageUrl || 'https://via.placeholder.com/800x300/667eea/ffffff?text=Blog+Image';
    const date = blog.createdAt ? new Date(blog.createdAt.toDate()).toLocaleDateString() : 'Unknown date';
    
    content.innerHTML = `
        <img src="${imageUrl}" alt="${blog.title}" class="blog-detail-image"
             onerror="this.src='https://via.placeholder.com/800x300/667eea/ffffff?text=Blog+Image'">
        <h1 class="blog-detail-title">${blog.title}</h1>
        <div class="blog-detail-meta">
            <span class="blog-detail-author">By ${blog.author}</span>
            <span class="blog-detail-date">${date}</span>
        </div>
        <div class="blog-detail-content">${blog.content}</div>
    `;
    
    modal.style.display = 'block';
}

// Search Functionality
function setupSearchListener() {
    const searchInput = document.getElementById('searchInput');
    searchInput.addEventListener('input', function() {
        const searchTerm = this.value.toLowerCase();
        const filteredBlogs = allBlogs.filter(blog => 
            blog.title.toLowerCase().includes(searchTerm) ||
            blog.author.toLowerCase().includes(searchTerm) ||
            blog.content.toLowerCase().includes(searchTerm)
        );
        displayBlogs(filteredBlogs);
    });
}

// Admin Functions
function showAdminLogin() {
    document.getElementById('adminModal').style.display = 'block';
}

function setupFormListeners() {
    // Admin login form
    document.getElementById('adminLoginForm').addEventListener('submit', async function(e) {
        e.preventDefault();
        
        const email = document.getElementById('adminEmail').value;
        const password = document.getElementById('adminPassword').value;
        
        try {
            await auth.signInWithEmailAndPassword(email, password);
        } catch (error) {
            console.error('Login error:', error);
            showNotification('Login failed. Please check your credentials.', 'error');
        }
    });
    
    // Add blog form
    document.getElementById('addBlogForm').addEventListener('submit', async function(e) {
        e.preventDefault();
        await saveBlog();
    });
}

async function saveBlog() {
    const title = document.getElementById('blogTitle').value;
    const author = document.getElementById('blogAuthor').value;
    const imageUrl = document.getElementById('blogImage').value;
    const content = document.getElementById('blogContent').value;
    
    if (!title || !author || !content) {
        showNotification('Please fill in all required fields', 'error');
        return;
    }
    
    const blogData = {
        title,
        author,
        imageUrl: imageUrl || '',
        content,
        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    };
    
    try {
        if (editingBlogId) {
            // Update existing blog
            await db.collection('blogs').doc(editingBlogId).update({
                ...blogData,
                createdAt: undefined // Don't update creation time
            });
            showNotification('Blog updated successfully!');
            editingBlogId = null;
        } else {
            // Add new blog
            await db.collection('blogs').add(blogData);
            showNotification('Blog added successfully!');
        }
        
        hideBlogForm();
        loadAdminBlogs();
        loadBlogs();
        
    } catch (error) {
        console.error('Error saving blog:', error);
        showNotification('Error saving blog', 'error');
    }
}

function showAddBlogForm() {
    document.getElementById('blogForm').style.display = 'block';
    document.getElementById('formTitle').textContent = 'Add New Blog';
    document.getElementById('addBlogForm').reset();
    editingBlogId = null;
}

function hideBlogForm() {
    document.getElementById('blogForm').style.display = 'none';
    document.getElementById('addBlogForm').reset();
    editingBlogId = null;
}

async function loadAdminBlogs() {
    const container = document.getElementById('adminBlogsContainer');
    container.innerHTML = '<div class="loading-spinner"><i class="fas fa-spinner fa-spin"></i><p>Loading...</p></div>';
    
    try {
        const snapshot = await db.collection('blogs')
            .orderBy('createdAt', 'desc')
            .get();
        
        container.innerHTML = '';
        
        if (snapshot.empty) {
            container.innerHTML = '<div class="no-blogs"><i class="fas fa-edit"></i><h3>No blogs yet</h3><p>Add your first blog post!</p></div>';
            return;
        }
        
        snapshot.forEach(doc => {
            const blog = { id: doc.id, ...doc.data() };
            const adminCard = createAdminBlogCard(blog);
            container.appendChild(adminCard);
        });
        
    } catch (error) {
        console.error('Error loading admin blogs:', error);
        container.innerHTML = '<div class="no-blogs"><i class="fas fa-exclamation-triangle"></i><h3>Error loading blogs</h3></div>';
    }
}

function createAdminBlogCard(blog) {
    const card = document.createElement('div');
    card.className = 'admin-blog-card';
    
    const date = blog.createdAt ? new Date(blog.createdAt.toDate()).toLocaleDateString() : 'Unknown date';
    
    card.innerHTML = `
        <div class="admin-blog-info">
            <h4>${blog.title}</h4>
            <p>By ${blog.author} • ${date}</p>
        </div>
        <div class="admin-blog-actions">
            <button class="admin-btn-small edit-btn" onclick="editBlog('${blog.id}')" title="Edit">
                <i class="fas fa-edit"></i>
            </button>
            <button class="admin-btn-small delete-btn" onclick="deleteBlog('${blog.id}')" title="Delete">
                <i class="fas fa-trash"></i>
            </button>
        </div>
    `;
    
    return card;
}

async function editBlog(blogId) {
    try {
        const doc = await db.collection('blogs').doc(blogId).get();
        if (doc.exists) {
            const blog = doc.data();
            
            document.getElementById('blogTitle').value = blog.title;
            document.getElementById('blogAuthor').value = blog.author;
            document.getElementById('blogImage').value = blog.imageUrl || '';
            document.getElementById('blogContent').value = blog.content;
            
            document.getElementById('formTitle').textContent = 'Edit Blog';
            document.getElementById('blogForm').style.display = 'block';
            editingBlogId = blogId;
        }
    } catch (error) {
        console.error('Error loading blog for edit:', error);
        showNotification('Error loading blog', 'error');
    }
}

async function deleteBlog(blogId) {
    if (confirm('Are you sure you want to delete this blog? This action cannot be undone.')) {
        try {
            await db.collection('blogs').doc(blogId).delete();
            showNotification('Blog deleted successfully!');
            loadAdminBlogs();
            loadBlogs();
        } catch (error) {
            console.error('Error deleting blog:', error);
            showNotification('Error deleting blog', 'error');
        }
    }
}

function adminLogout() {
    auth.signOut().then(() => {
        showNotification('Logged out successfully');
        showSection('home');
    }).catch(error => {
        console.error('Logout error:', error);
        showNotification('Error logging out', 'error');
    });
}

// Modal Functions
function closeModal(modalId) {
    document.getElementById(modalId).style.display = 'none';
}

// Click outside modal to close
window.onclick = function(event) {
    const modals = document.querySelectorAll('.modal');
    modals.forEach(modal => {
        if (event.target === modal) {
            modal.style.display = 'none';
        }
    });
}

// Notification Function
function showNotification(message, type = 'success') {
    const notification = document.getElementById('notification');
    const notificationText = document.getElementById('notificationText');
    const icon = notification.querySelector('i');
    
    notificationText.textContent = message;
    
    // Reset classes
    notification.className = 'notification';
    
    // Set type-specific styling
    if (type === 'error') {
        notification.classList.add('error');
        icon.className = 'fas fa-exclamation-circle';
    } else {
        icon.className = 'fas fa-check-circle';
    }
    
    // Show notification
    notification.classList.add('show');
    
    // Hide after 3 seconds
    setTimeout(() => {
        notification.classList.remove('show');
    }, 3000);
}

// Utility Functions
function formatDate(timestamp) {
    if (!timestamp) return 'Unknown date';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
}

function createPlaceholderImage(text = 'Blog Image') {
    return `https://via.placeholder.com/400x200/667eea/ffffff?text=${encodeURIComponent(text)}`;
}

// Initialize demo data (for testing without Firebase setup)
function initializeDemoData() {
    const demoBlogs = [
        {
            title: "Getting Started with Web Development",
            author: "John Doe",
            content: "Web development is an exciting field that combines creativity with technical skills. In this post, we'll explore the fundamentals of HTML, CSS, and JavaScript, and how they work together to create amazing web experiences.\n\nHTML provides the structure, CSS handles the styling, and JavaScript brings interactivity to life. Whether you're a complete beginner or looking to refresh your knowledge, this guide will help you understand the core concepts.\n\nLet's start with HTML - the backbone of every webpage. HTML uses elements and tags to define the structure and content of a page. From headings and paragraphs to images and links, HTML gives meaning to your content.",
            imageUrl: "https://via.placeholder.com/400x200/667eea/ffffff?text=Web+Development",
            createdAt: new Date()
        },
        {
            title: "The Future of Artificial Intelligence",
            author: "Jane Smith",
            content: "Artificial Intelligence is reshaping our world in ways we never imagined. From healthcare to transportation, AI is revolutionizing industries and creating new possibilities for human advancement.\n\nMachine learning algorithms are becoming more sophisticated, enabling computers to learn from data and make predictions with incredible accuracy. Natural language processing allows machines to understand and generate human language, opening doors to more intuitive human-computer interactions.\n\nAs we look to the future, AI promises to solve some of humanity's greatest challenges while also raising important questions about ethics, privacy, and the role of humans in an increasingly automated world.",
            imageUrl: "https://via.placeholder.com/400x200/764ba2/ffffff?text=AI+Future",
            createdAt: new Date(Date.now() - 86400000) // 1 day ago
        },
        {
            title: "Sustainable Living in the Digital Age",
            author: "Mike Johnson",
            content: "Living sustainably has never been more important, and technology is playing a crucial role in helping us reduce our environmental impact. From smart home devices that optimize energy usage to apps that help us track our carbon footprint, digital tools are empowering individuals to make more eco-friendly choices.\n\nThe circular economy is gaining momentum, with companies designing products for longevity and recyclability. Digital platforms are facilitating the sharing economy, allowing us to maximize the utility of resources through collaborative consumption.\n\nBy embracing both sustainable practices and leveraging technology thoughtfully, we can create a more environmentally conscious lifestyle without sacrificing the conveniences of modern life.",
            imageUrl: "https://via.placeholder.com/400x200/48bb78/ffffff?text=Sustainability",
            createdAt: new Date(Date.now() - 172800000) // 2 days ago
        }
    ];
    
    // Only add demo data if no blogs exist
    db.collection('blogs').get().then(snapshot => {
        if (snapshot.empty) {
            demoBlogs.forEach(blog => {
                db.collection('blogs').add({
                    ...blog,
                    createdAt: firebase.firestore.Timestamp.fromDate(blog.createdAt)
                });
            });
        }
    });
}

// Error Handling
window.addEventListener('error', function(e) {
    console.error('Global error:', e.error);
    showNotification('An unexpected error occurred', 'error');
});

// Initialize demo data when Firebase is ready
setTimeout(() => {
    initializeDemoData();
}, 1000);

// Firebase Configuration Instructions
console.log(`
🔥 Firebase Setup Instructions:

1. Go to https://console.firebase.google.com/
2. Create a new project or use existing one
3. Enable Firestore Database and Authentication
4. Get your Firebase config from Project Settings
5. Replace the firebaseConfig object in this file with your actual config
6. Enable Email/Password authentication in Firebase Console
7. Create an admin user in Firebase Authentication

Your Firebase config should look like:
{
    apiKey: "your-actual-api-key",
    authDomain: "your-project.firebaseapp.com",
    projectId: "your-actual-project-id",
    storageBucket: "your-project.appspot.com",
    messagingSenderId: "your-sender-id",
    appId: "your-app-id"
}

For demo purposes, sample blogs will be added automatically.
`);

// Smooth scrolling for better UX
document.documentElement.style.scrollBehavior = 'smooth';