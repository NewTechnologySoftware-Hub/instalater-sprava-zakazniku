// Konfigurace pro Firebase, kterou jste poskytl.
const firebaseConfig = {
    apiKey: "AIzaSyAN-F1ej3JSvQG_6qIhcAywh3WCZfvu89I",
    authDomain: "ahojyyy.firebaseapp.com",
    projectId: "ahojyyy",
    storageBucket: "ahojyyy.firebasestorage.app",
    messagingSenderId: "89448328029",
    appId: "1:89448328029:web:013dec5723130f5e5096b4"
};

// Inicializace Firebase aplikace
firebase.initializeApp(firebaseConfig);
const database = firebase.database();
const customersRef = database.ref('customers');

// Získání elementů z DOM
const initialMenu = document.getElementById('initial-menu');
const addCustomerView = document.getElementById('add-customer-view');
const addCustomerTitle = document.getElementById('add-customer-view').querySelector('h2');
const searchCustomerView = document.getElementById('search-customer-view');

const showAddCustomerBtn = document.getElementById('show-add-customer');
const showSearchCustomerBtn = document.getElementById('show-search-customer');
const backToMenuAddBtn = document.getElementById('back-to-menu-add');
const backToMenuSearchBtn = document.getElementById('back-to-menu-search');

const customerForm = document.getElementById('customer-form');
const nameInput = document.getElementById('name');
const addressInput = document.getElementById('address');
const phoneInput = document.getElementById('phone');
const phoneStatus = document.getElementById('phone-status');
const emailInput = document.getElementById('email');
const dateInput = document.getElementById('date');
const noteInput = document.getElementById('note');
const alertMessage = document.getElementById('alert-message');

const searchInput = document.getElementById('search-input');
const searchButton = document.getElementById('search-button');
const searchResults = document.getElementById('search-results');
const showAllCustomersBtn = document.getElementById('show-all-customers');

const confirmDialog = document.getElementById('confirm-dialog');
const dialogConfirmBtn = document.getElementById('dialog-confirm');
const dialogCancelBtn = document.getElementById('dialog-cancel');

const warningDialog = document.getElementById('warning-dialog');
const existingCustomersList = document.getElementById('existing-customers-list');
const ignoreWarningBtn = document.getElementById('ignore-warning-btn');

const loadingOverlay = document.getElementById('loading-overlay');

let currentCustomerId = null; // Proměnná pro uložení ID upravovaného zákazníka
let isIgnoringWarning = false; // Příznak pro ignorování duplicitního čísla

// Pomocná funkce pro normalizaci telefonního čísla (odstraní mezery)
const normalizePhoneNumber = (phoneNumber) => {
    if (!phoneNumber) return '';
    return phoneNumber.replace(/\s/g, '');
};

// Funkce pro přepínání mezi pohledy
const showView = (view) => {
    initialMenu.classList.add('hidden');
    addCustomerView.classList.add('hidden');
    searchCustomerView.classList.add('hidden');
    view.classList.remove('hidden');
};

// Funkce pro zobrazení zprávy (chyba nebo úspěch)
const showAlert = (message, type) => {
    alertMessage.textContent = message;
    alertMessage.className = `alert show ${type}`;
    setTimeout(() => {
        alertMessage.className = 'alert';
    }, 3000);
};

// Funkce pro mazání zákazníka z databáze Firebase
const deleteCustomer = (customerId) => {
    customersRef.child(customerId).remove()
        .then(() => {
            showAlert('Zákazník byl úspěšně smazán!', 'success');
            // Logika po smazání z varovného dialogu
            if (!warningDialog.classList.contains('hidden')) {
                warningDialog.classList.add('hidden');
                setPhoneStatus('Nový zákazník...', 'ok');
            }
            performSearch();
            confirmDialog.classList.add('hidden');
        })
        .catch(error => {
            showAlert('Chyba při mazání zákazníka: ' + error.message, 'error');
            confirmDialog.classList.add('hidden');
        });
};

// Funkce pro vytvoření karty zákazníka a přidání do DOM
const createCustomerCard = (key, customer, container) => {
    const customerCard = document.createElement('div');
    customerCard.className = 'customer-card';
    customerCard.innerHTML = `
        <p><strong>Jméno:</strong> ${customer.name || ''}</p>
        <p><strong>Adresa:</strong> ${customer.address || ''}</p>
        <p><strong>Telefon:</strong> ${customer.phone || ''}</p>
        <p><strong>E-mail:</strong> ${customer.email || ''}</p>
        <p><strong>Datum:</strong> ${customer.date || ''}</p>
        <p><strong>Poznámka:</strong> ${customer.note || ''}</p>
        <div class="action-buttons">
            <button class="edit-btn" data-id="${key}"><i class="fas fa-edit"></i> Upravit</button>
            <button class="delete-btn" data-id="${key}"><i class="fas fa-trash-alt"></i> Smazat</button>
        </div>
    `;
    container.appendChild(customerCard);
};

// Funkce pro přidání posluchačů na tlačítka Smazat a Upravit
const addActionListeners = () => {
    document.querySelectorAll('.delete-btn').forEach(button => {
        button.addEventListener('click', (e) => {
            currentCustomerId = e.target.dataset.id;
            confirmDialog.classList.remove('hidden');
            // Zajistíme, že potvrzovací dialog je na popředí
            confirmDialog.style.zIndex = '1001';
            warningDialog.style.zIndex = '1000';
        });
    });
    document.querySelectorAll('.edit-btn').forEach(button => {
        button.addEventListener('click', (e) => {
            const customerId = e.target.dataset.id;
            customersRef.child(customerId).once('value', (snapshot) => {
                const customerData = snapshot.val();
                nameInput.value = customerData.name || '';
                addressInput.value = customerData.address || '';
                phoneInput.value = customerData.phone || '';
                emailInput.value = customerData.email || '';
                dateInput.value = customerData.date || '';
                noteInput.value = customerData.note || '';
                currentCustomerId = customerId;
                customerForm.querySelector('button[type="submit"]').textContent = 'Uložit úpravy';
                // Změna nadpisu
                addCustomerTitle.textContent = 'Úprava existujícího zákazníka';
                // Zavřít varovný dialog, pokud je otevřen
                warningDialog.classList.add('hidden');
                showView(addCustomerView);
            });
        });
    });
};

// Funkce pro vyhledávání zákazníků (s normalizací)
const performSearch = () => {
    const searchTerm = normalizePhoneNumber(searchInput.value.toLowerCase());
    searchResults.innerHTML = '';

    customersRef.once('value', (snapshot) => {
        const customers = snapshot.val();
        let found = false;

        if (customers) {
            Object.entries(customers).forEach(([key, customer]) => {
                const normalizedCustomerPhone = normalizePhoneNumber(customer.phone);
                // Kontrola, zda se hledaný výraz nachází v jakékoliv hodnotě záznamu nebo v normalizovaném tel. čísle
                const matches = Object.values(customer).some(value =>
                    (value && typeof value === 'string' && value.toLowerCase().includes(searchInput.value.toLowerCase()))
                ) || normalizedCustomerPhone.includes(searchTerm);

                if (matches) {
                    createCustomerCard(key, customer, searchResults);
                    found = true;
                }
            });

            if (found) {
                addActionListeners();
            }
        }

        if (!found) {
            searchResults.innerHTML = '<p style="text-align: center; color: #dc3545;">Žádný zákazník neodpovídá zadanému filtru.</p>';
        }
    });
};

// Funkce pro zobrazení kompletního výpisu zákazníků s minimálním zpožděním
const showAllCustomers = () => {
    loadingOverlay.classList.remove('hidden');
    searchResults.innerHTML = '';

    const startTime = Date.now();

    customersRef.once('value', (snapshot) => {
        const customers = snapshot.val();
        const elapsedTime = Date.now() - startTime;
        const remainingTime = 8000 - elapsedTime;

        if (remainingTime > 0) {
            setTimeout(() => {
                loadingOverlay.classList.add('hidden');
                displayAllCustomers(customers);
            }, remainingTime);
        } else {
            loadingOverlay.classList.add('hidden');
            displayAllCustomers(customers);
        }
    });
};

const displayAllCustomers = (customers) => {
    if (customers) {
        Object.entries(customers).forEach(([key, customer]) => {
            createCustomerCard(key, customer, searchResults);
        });
        addActionListeners();
    } else {
        searchResults.innerHTML = '<p style="text-align: center; color: #dc3545;">Databáze je prázdná.</p>';
    }
};

// Funkce pro zobrazení statusu pod telefonním číslem
const setPhoneStatus = (message, type) => {
    phoneStatus.innerHTML = `<i class="fas fa-${type === 'ok' ? 'check' : 'times'}"></i> ${message}`;
    phoneStatus.className = `phone-status-text ${type}`;
};

// Kontrola duplicitního telefonního čísla při opuštění pole
phoneInput.addEventListener('blur', () => {
    phoneStatus.innerHTML = '';
    const phoneNumber = normalizePhoneNumber(phoneInput.value.trim());

    if (phoneNumber === '') {
        return;
    }

    customersRef.once('value', (snapshot) => {
        const customers = snapshot.val();
        const existingCustomers = [];

        if (customers) {
            Object.entries(customers).forEach(([key, customer]) => {
                const normalizedCustomerPhone = normalizePhoneNumber(customer.phone);
                if (normalizedCustomerPhone === phoneNumber) {
                    existingCustomers.push({ key, ...customer });
                }
            });
        }

        if (existingCustomers.length > 0) {
            isIgnoringWarning = false;
            // Zobrazit varovný dialog s nalezenými zákazníky
            existingCustomersList.innerHTML = '';
            existingCustomers.forEach(customer => {
                const customerCard = document.createElement('div');
                customerCard.className = 'customer-card';
                customerCard.innerHTML = `
                    <p><strong>Jméno:</strong> ${customer.name || ''}</p>
                    <p><strong>Adresa:</strong> ${customer.address || ''}</p>
                    <p><strong>Telefon:</strong> ${customer.phone || ''}</p>
                    <p><strong>E-mail:</strong> ${customer.email || ''}</p>
                    <p><strong>Datum:</strong> ${customer.date || ''}</p>
                    <p><strong>Poznámka:</strong> ${customer.note || ''}</p>
                    <div class="action-buttons">
                        <button class="edit-btn" data-id="${customer.key}"><i class="fas fa-edit"></i> Upravit</button>
                        <button class="delete-btn" data-id="${customer.key}"><i class="fas fa-trash-alt"></i> Smazat</button>
                    </div>
                `;
                existingCustomersList.appendChild(customerCard);
            });
            addActionListeners();
            warningDialog.classList.remove('hidden');
        } else {
            // Zobrazit, že se jedná o nového zákazníka
            setPhoneStatus('Nový zákazník...', 'ok');
        }
    });
});

// Posluchač událostí pro odeslání formuláře
customerForm.addEventListener('submit', (e) => {
    e.preventDefault();

    const name = nameInput.value;
    const address = addressInput.value;
    const phone = phoneInput.value;
    const email = emailInput.value;
    const date = dateInput.value;
    const note = noteInput.value;

    if (!name && !address && !phone && !email && !date && !note) {
        showAlert('Musí být vyplněno alespoň jedno pole!', 'error');
        return;
    }

    const customer = {
        name: name,
        address: address,
        phone: phone,
        email: email,
        date: date,
        note: note
    };

    if (currentCustomerId) {
        customersRef.child(currentCustomerId).update(customer)
            .then(() => {
                showAlert('Zákazník byl úspěšně upraven!', 'success');
                customerForm.reset();
                customerForm.querySelector('button[type="submit"]').textContent = 'Uložit';
                currentCustomerId = null;
                showView(searchCustomerView);
                performSearch();
            })
            .catch(error => {
                showAlert('Chyba při úpravě zákazníka: ' + error.message, 'error');
            });
    } else {
        customersRef.push(customer)
            .then(() => {
                showAlert('Zákazník byl úspěšně uložen!', 'success');
                customerForm.reset();
            })
            .catch(error => {
                showAlert('Chyba při ukládání zákazníka: ' + error.message, 'error');
            });
    }
});

// Posluchače událostí pro tlačítka v menu
showAddCustomerBtn.addEventListener('click', () => {
    showView(addCustomerView);
    customerForm.reset();
    currentCustomerId = null;
    phoneStatus.innerHTML = ''; // Vyčistit status
    addCustomerTitle.textContent = 'Přidat nového zákazníka'; // Reset nadpisu
    customerForm.querySelector('button[type="submit"]').textContent = 'Uložit';
});
showSearchCustomerBtn.addEventListener('click', () => {
    showView(searchCustomerView);
    searchInput.value = '';
    searchResults.innerHTML = '';
});
backToMenuAddBtn.addEventListener('click', () => showView(initialMenu));
backToMenuSearchBtn.addEventListener('click', () => showView(initialMenu));

// Posluchače událostí pro vyhledávání a kompletní výpis
searchButton.addEventListener('click', performSearch);
searchInput.addEventListener('keyup', (e) => {
    if (e.key === 'Enter') {
        performSearch();
    }
});
showAllCustomersBtn.addEventListener('click', showAllCustomers);

// Posluchače událostí pro dialog s potvrzením
dialogConfirmBtn.addEventListener('click', () => {
    if (currentCustomerId) {
        deleteCustomer(currentCustomerId);
    }
});
dialogCancelBtn.addEventListener('click', () => {
    confirmDialog.classList.add('hidden');
    currentCustomerId = null;
});

// Posluchač pro tlačítko "Ignorovat varování"
ignoreWarningBtn.addEventListener('click', () => {
    warningDialog.classList.add('hidden');
    setPhoneStatus('Takový zákazník již existuje, uložením se vytvoří další zákazník se stejným telefonním číslem.', 'warning');
    isIgnoringWarning = true;
});


// Zobrazení úvodního menu při načtení stránky
document.addEventListener('DOMContentLoaded', () => {
    showView(initialMenu);
});
