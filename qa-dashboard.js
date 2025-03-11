import { supabase } from './supabase-config.js';
import { getCurrentUser, signOut } from './auth.js';

let currentUser = null;
// Make categories globally accessible
window.categories = [];
let questions = [];

// Initialize data
async function initializeData() {
    currentUser = await getCurrentUser();
    if (!currentUser) {
        window.location.href = '/login.html';
        return;
    }
    await loadData();
}

// Load data from Supabase
async function loadData() {
    try {
        // Load categories
        let { data: categoriesData, error: categoriesError } = await supabase
            .from('categories')
            .select('*')
            .eq('user_id', currentUser.id)
            .order('created_at');

        if (categoriesError) throw categoriesError;
        window.categories = categoriesData;

        // Load questions
        let { data: questionsData, error: questionsError } = await supabase
            .from('questions')
            .select('*')
            .eq('user_id', currentUser.id)
            .order('sort_order');

        if (questionsError) throw questionsError;
        questions = questionsData;

        renderCategories();
        renderQA();
        updateCategoryDropdowns();
    } catch (error) {
        console.error('Error loading data:', error);
        alert('Failed to load data. Please try again.');
    }
}

// Update category dropdowns in modals
function updateCategoryDropdowns() {
    const addSelect = document.getElementById('category');
    const editSelect = document.getElementById('edit-category');
    const options = window.categories.map(category => 
        `<option value="${category.id}">${category.name}</option>`
    ).join('');
    
    addSelect.innerHTML = '<option value="">Select Category</option>' + options;
    editSelect.innerHTML = '<option value="">Select Category</option>' + options;
}

// Add new category
async function addCategory(categoryName) {
    try {
        const { data, error } = await supabase
            .from('categories')
            .insert([
                { 
                    name: categoryName,
                    user_id: currentUser.id 
                }
            ])
            .select();

        if (error) throw error;
        window.categories.push(data[0]);
        renderCategories();
        updateCategoryDropdowns();
        return data[0];
    } catch (error) {
        console.error('Error adding category:', error);
        alert('Failed to add category. Please try again.');
        return null;
    }
}

// Add new Q&A
async function addQA(categoryId, question, answer) {
    try {
        const maxSortOrder = questions.reduce((max, q) => Math.max(max, q.sort_order || 0), 0);
        const { data, error } = await supabase
            .from('questions')
            .insert([
                {
                    category_id: categoryId,
                    question: question,
                    answer: answer,
                    user_id: currentUser.id,
                    sort_order: maxSortOrder + 1
                }
            ])
            .select();

        if (error) throw error;
        questions.push(data[0]);
        renderQA();
        return data[0];
    } catch (error) {
        console.error('Error adding Q&A:', error);
        alert('Failed to add Q&A. Please try again.');
        return null;
    }
}

// Update Q&A
async function updateQA(id, categoryId, question, answer) {
    try {
        const { data, error } = await supabase
            .from('questions')
            .update({
                category_id: categoryId,
                question: question,
                answer: answer
            })
            .eq('id', id)
            .eq('user_id', currentUser.id)
            .select();

        if (error) throw error;
        const index = questions.findIndex(q => q.id === id);
        if (index !== -1) {
            questions[index] = data[0];
        }
        renderQA();
        return data[0];
    } catch (error) {
        console.error('Error updating Q&A:', error);
        alert('Failed to update Q&A. Please try again.');
        return null;
    }
}

// Delete Q&A
async function deleteQA(id) {
    try {
        const { error } = await supabase
            .from('questions')
            .delete()
            .eq('id', id)
            .eq('user_id', currentUser.id);

        if (error) throw error;
        questions = questions.filter(q => q.id !== id);
        renderQA();
    } catch (error) {
        console.error('Error deleting Q&A:', error);
        alert('Failed to delete Q&A. Please try again.');
    }
}

// Update sort order
async function updateSortOrder(reorderedQuestions) {
    try {
        const updates = reorderedQuestions.map((q, index) => ({
            id: q.id,
            sort_order: index + 1
        }));

        const { error } = await supabase
            .from('questions')
            .upsert(updates, { onConflict: 'id' });

        if (error) throw error;
        questions = reorderedQuestions.map((q, index) => ({ ...q, sort_order: index + 1 }));
    } catch (error) {
        console.error('Error updating sort order:', error);
        alert('Failed to update order. Please try again.');
    }
}

// Render categories
function renderCategories() {
    const container = document.getElementById('categories-container');
    container.innerHTML = window.categories.map(category => `
        <button
            data-category-id="${category.id}"
            class="category-btn px-4 py-2 text-sm font-medium text-gray-700 hover:text-primary-600 focus:outline-none"
        >
            ${category.name}
        </button>
    `).join('');

    // Add event listeners
    document.querySelectorAll('.category-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.category-btn').forEach(b => b.classList.remove('text-primary-600'));
            btn.classList.add('text-primary-600');
            renderQA(btn.dataset.categoryId);
        });
    });
}

// Render Q&A list
function renderQA(categoryId = null) {
    const container = document.getElementById('qa-list');
    const filteredQuestions = categoryId
        ? questions.filter(q => q.category_id === categoryId)
        : questions;

    container.innerHTML = filteredQuestions.map(qa => `
        <div class="qa-item bg-white rounded-lg shadow-sm p-4 mb-4" data-id="${qa.id}">
            <div class="flex items-center justify-between">
                <h3 class="text-lg font-medium text-gray-900">${qa.question}</h3>
                <div class="flex items-center space-x-2">
                    <button class="text-gray-400 hover:text-gray-600" onclick="toggleAnswer('${qa.id}')">
                        <i class="fas fa-chevron-down"></i>
                    </button>
                    <div class="relative">
                        <button class="text-gray-400 hover:text-gray-600" onclick="toggleOptions('${qa.id}')">
                            <i class="fas fa-ellipsis-v"></i>
                        </button>
                        <div id="options-${qa.id}" class="hidden absolute right-0 mt-2 w-48 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5">
                            <div class="py-1">
                                <button onclick="editQA('${qa.id}')" class="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">
                                    Edit
                                </button>
                                <button onclick="deleteQA('${qa.id}')" class="block w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-gray-100">
                                    Delete
                                </button>
                            </div>
                        </div>
                    </div>
                    <button class="text-gray-400 hover:text-gray-600 cursor-move handle">
                        <i class="fas fa-grip-vertical"></i>
                    </button>
                </div>
            </div>
            <div id="answer-${qa.id}" class="hidden mt-4">
                <div class="flex justify-between items-start">
                    <p class="text-gray-600 whitespace-pre-wrap">${qa.answer}</p>
                    <button onclick="copyAnswer('${qa.id}')" class="ml-4 text-gray-400 hover:text-gray-600">
                        <i class="fas fa-copy"></i>
                    </button>
                </div>
            </div>
        </div>
    `).join('');

    // Initialize sorting
    initializeSorting();
}

// Initialize sorting functionality
function initializeSorting() {
    const container = document.getElementById('qa-list');
    Sortable.create(container, {
        handle: '.handle',
        animation: 150,
        onEnd: async function(evt) {
            const items = Array.from(container.children);
            const reorderedQuestions = items.map(item => {
                const id = item.dataset.id;
                return questions.find(q => q.id === id);
            });
            await updateSortOrder(reorderedQuestions);
        }
    });
}

// Event Handlers
window.toggleAnswer = function(id) {
    const answerDiv = document.getElementById(`answer-${id}`);
    const icon = event.currentTarget.querySelector('i');
    answerDiv.classList.toggle('hidden');
    icon.classList.toggle('fa-chevron-down');
    icon.classList.toggle('fa-chevron-up');
};

window.toggleOptions = function(id) {
    const optionsMenu = document.getElementById(`options-${id}`);
    optionsMenu.classList.toggle('hidden');
};

window.copyAnswer = function(id) {
    const qa = questions.find(q => q.id === id);
    navigator.clipboard.writeText(qa.answer);
    alert('Answer copied to clipboard!');
};

window.editQA = function(id) {
    const qa = questions.find(q => q.id === id);
    document.getElementById('edit-qa-id').value = id;
    document.getElementById('edit-category').value = qa.category_id;
    document.getElementById('edit-question').value = qa.question;
    document.getElementById('edit-answer').value = qa.answer;
    document.getElementById('edit-qa-modal').classList.remove('hidden');
};

window.deleteQA = deleteQA;

// Initialize
document.addEventListener('DOMContentLoaded', initializeData);

// Event listeners for modals
document.getElementById('add-category-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const categoryName = document.getElementById('category-name').value;
    const category = await addCategory(categoryName);
    if (category) {
        document.getElementById('add-category-modal').classList.add('hidden');
        document.getElementById('category-name').value = '';
    }
});

document.getElementById('add-qa-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const categoryId = document.getElementById('category').value;
    const question = document.getElementById('question').value;
    const answer = document.getElementById('answer').value;
    const qa = await addQA(categoryId, question, answer);
    if (qa) {
        document.getElementById('add-qa-modal').classList.add('hidden');
        document.getElementById('question').value = '';
        document.getElementById('answer').value = '';
    }
});

document.getElementById('edit-qa-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const id = document.getElementById('edit-qa-id').value;
    const categoryId = document.getElementById('edit-category').value;
    const question = document.getElementById('edit-question').value;
    const answer = document.getElementById('edit-answer').value;
    const qa = await updateQA(id, categoryId, question, answer);
    if (qa) {
        document.getElementById('edit-qa-modal').classList.add('hidden');
    }
});

// Search functionality
document.getElementById('search').addEventListener('input', (e) => {
    const searchTerm = e.target.value.toLowerCase();
    const filteredQuestions = questions.filter(qa =>
        qa.question.toLowerCase().includes(searchTerm) ||
        qa.answer.toLowerCase().includes(searchTerm)
    );
    renderQA(null, filteredQuestions);
});

// Add logout function
async function logout() {
    const { error } = await signOut();
    if (error) {
        console.error('Error signing out:', error);
        alert('Failed to sign out. Please try again.');
    }
} 