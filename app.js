/**
 * ANCHOR: PayPal Element Response Viewer
 * @description Main application logic for PayPal integration and response display
 */

// State management
let buttonsInstance = null;
let currentConfig = null;
let paypalSDKLoaded = false;

const STORAGE_KEY = 'paypalElementViewerConfig';

/**
 * ANCHOR: Format Response as JSON
 * @description Convert response object to formatted JSON string
 * @param {Object} data - Response data object
 * @param {string} type - Response type: 'approve', 'error', or 'cancel'
 * @returns {string} - Formatted JSON string
 */
function formatResponseAsJSON(data, type) {
    const responseObject = {
        type: type.toUpperCase(),
        timestamp: new Date().toISOString(),
        data: data,
    };

    try {
        return JSON.stringify(responseObject, null, 2);
    } catch (error) {
        // Fallback if JSON.stringify fails (e.g., circular references)
        return JSON.stringify(
            {
                type: type.toUpperCase(),
                timestamp: new Date().toISOString(),
                error: 'Failed to stringify response',
                message: error.message,
            },
            null,
            2,
        );
    }
}

/**
 * ANCHOR: Display Response
 * @description Update UI with formatted JSON response data
 * @param {Object} data - Response data object
 * @param {string} type - Response type: 'approve', 'error', or 'cancel'
 */
function displayResponse(data, type) {
    const responseDisplay = document.getElementById('responseDisplay');
    const formattedJSON = formatResponseAsJSON(data, type);

    responseDisplay.innerHTML = `<pre class="json-display">${escapeHtml(formattedJSON)}</pre>`;
    responseDisplay.scrollTop = 0;
}

/**
 * ANCHOR: Escape HTML
 * @description Escape HTML special characters to prevent XSS
 * @param {string} text - Text to escape
 * @returns {string} - Escaped HTML string
 */
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

/**
 * ANCHOR: Clear Response Display
 * @description Reset response display to empty state
 */
function clearResponse() {
    const responseDisplay = document.getElementById('responseDisplay');
    responseDisplay.innerHTML =
        '<p class="empty-state">No response yet. Complete a PayPal transaction to see the response.</p>';
}

/**
 * ANCHOR: Handle PayPal Approval
 * @description Handle successful PayPal payment approval
 * @param {Object} data - Approval data from PayPal
 * @param {Object} actions - PayPal actions object
 */
async function handleApprove(data, actions) {
    try {
        let responseData = {
            orderID: data.orderID || null,
            subscriptionID: data.subscriptionID || null,
            payerID: data.payerID || null,
            paymentID: data.paymentID || null,
            billingToken: data.billingToken || null,
            facilitatorAccessToken: data.facilitatorAccessToken || null,
        };

        // For order mode, try to capture
        if (currentConfig.mode === 'order' && data.orderID && actions.order) {
            try {
                const captureResult = await actions.order.capture();
                responseData.captureDetails = captureResult;
            } catch (captureError) {
                responseData.captureError = {
                    message: captureError.message,
                    error: captureError,
                };
            }
        }

        // For subscription mode, get subscription details
        if (currentConfig.mode === 'recurring' && data.subscriptionID && actions.subscription) {
            try {
                const subscriptionDetails = await actions.subscription.get();
                responseData.subscriptionDetails = subscriptionDetails;
            } catch (subError) {
                responseData.subscriptionError = {
                    message: subError.message,
                    error: subError,
                };
            }
        }

        displayResponse(responseData, 'approve');
    } catch (error) {
        displayResponse(
            {
                error: error.message,
                originalData: data,
                stack: error.stack,
            },
            'error',
        );
    }
}

/**
 * ANCHOR: Handle PayPal Error
 * @description Handle PayPal payment errors
 * @param {Error} err - Error object from PayPal
 */
function handleError(err) {
    const errorData = {
        message: err.message || 'Unknown error',
        name: err.name || 'Error',
        error: err.toString(),
    };

    if (err.stack) {
        errorData.stack = err.stack;
    }

    displayResponse(errorData, 'error');
}

/**
 * ANCHOR: Handle PayPal Cancellation
 * @description Handle user cancellation of PayPal payment
 * @param {Object} data - Cancellation data from PayPal
 */
function handleCancel(data) {
    displayResponse(
        {
            message: 'User cancelled the payment',
            cancellationData: data,
        },
        'cancel',
    );
}

/**
 * ANCHOR: Load PayPal SDK Dynamically
 * @description Load PayPal SDK script with dynamic client ID
 * @param {string} clientId - PayPal Client ID
 * @param {string} mode - Payment mode: 'order' or 'recurring'
 * @returns {Promise} - Promise that resolves when SDK is loaded
 */
function loadPayPalSDK(clientId, mode) {
    return new Promise((resolve, reject) => {
        // Check if PayPal SDK is already loaded with the same client ID
        if (window.paypal && paypalSDKLoaded) {
            resolve(window.paypal);
            return;
        }

        // Remove existing PayPal SDK script if any
        const existingScript = document.querySelector('script[src*="paypal.com/sdk"]');
        if (existingScript) {
            existingScript.remove();
            paypalSDKLoaded = false;
        }

        // Create new script element
        const script = document.createElement('script');
        const intent = mode === 'recurring' ? 'subscription' : 'capture';
        
        script.src = `https://www.paypal.com/sdk/js?client-id=${clientId}&currency=USD&intent=${intent}${vault}&disable-funding=card,credit,venmo,paylater,bancontact,blik,eps,giropay,ideal,mercadopago,mybank,p24,sepa,sofort`;
        script.async = true;

        script.onload = () => {
            if (window.paypal) {
                paypalSDKLoaded = true;
                resolve(window.paypal);
            } else {
                reject(new Error('PayPal SDK failed to load'));
            }
        };

        script.onerror = () => {
            reject(new Error('Failed to load PayPal SDK script'));
        };

        document.head.appendChild(script);
    });
}

/**
 * ANCHOR: Render PayPal Button
 * @description Initialize and render PayPal button based on current configuration
 */
async function renderPayPalButton() {
    const container = document.getElementById('paypalButtonContainer');
    container.innerHTML = '<p>Loading PayPal button...</p>';

    // Clear previous button instance
    if (buttonsInstance) {
        try {
            buttonsInstance.close();
        } catch (e) {
            console.warn('Error closing previous button:', e);
        }
        buttonsInstance = null;
    }

    try {
        // Load PayPal SDK with client ID and mode
        const paypal = await loadPayPalSDK(currentConfig.clientId, currentConfig.mode);

        if (!paypal) {
            throw new Error('Failed to load PayPal SDK');
        }

        container.innerHTML = '';

        const buttonConfig = {
            style: {
                layout: 'vertical',
                color: 'gold',
                shape: 'rect',
                label: currentConfig.mode === 'recurring' ? 'subscribe' : 'paypal',
                height: 50,
            },
            onApprove: handleApprove,
            onError: handleError,
            onCancel: handleCancel,
        };

        // For order mode, we need to handle existing order ID
        if (currentConfig.mode === 'order' && currentConfig.orderId) {
            // PayPal doesn't directly support approving existing orders via button
            // We'll use a workaround by creating a minimal order flow
            // Note: This is a limitation - PayPal buttons typically create orders
            buttonConfig.createOrder = async () => {
                // Return the existing order ID
                return currentConfig.orderId;
            };
        }

        // For recurring mode with existing subscription ID
        if (currentConfig.mode === 'recurring' && currentConfig.subscriptionId) {
            // For subscriptions, we can use the existing subscription ID
            // The button will handle the approval flow
            buttonConfig.createSubscription = async () => {
                return currentConfig.subscriptionId;
            };
        }

        buttonsInstance = paypal.Buttons(buttonConfig);

        if (buttonsInstance.isEligible && buttonsInstance.isEligible()) {
            await buttonsInstance.render(container);
        } else {
            container.innerHTML =
                '<p style="color: red;">PayPal is not eligible for this transaction. Please check your configuration.</p>';
        }
    } catch (error) {
        container.innerHTML = `<p style="color: red;">Error: ${error.message}</p>`;
        handleError(error);
    }
}

/**
 * ANCHOR: Save Config to LocalStorage
 * @description Save current configuration to localStorage
 * @param {Object} config - Configuration object to save
 */
function saveToLocalStorage(config) {
    try {
        const dataToSave = {
            clientId: config.clientId,
            mode: config.mode,
            orderId: config.orderId || '',
            subscriptionId: config.subscriptionId || '',
        };
        localStorage.setItem(STORAGE_KEY, JSON.stringify(dataToSave));
    } catch (error) {
        console.warn('Failed to save to localStorage:', error);
    }
}

/**
 * ANCHOR: Load Config from LocalStorage
 * @description Load saved configuration from localStorage
 * @returns {Object|null} - Saved configuration or null if not found
 */
function loadFromLocalStorage() {
    try {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved) {
            return JSON.parse(saved);
        }
    } catch (error) {
        console.warn('Failed to load from localStorage:', error);
    }
    return null;
}

/**
 * ANCHOR: Load Saved Config to Form
 * @description Pre-fill form fields with saved configuration
 */
function loadSavedConfigToForm() {
    const saved = loadFromLocalStorage();
    if (!saved) {
        return;
    }

    const clientIdInput = document.getElementById('clientId');
    const paymentModeSelect = document.getElementById('paymentMode');
    const orderIdInput = document.getElementById('orderId');
    const subscriptionIdInput = document.getElementById('subscriptionId');

    if (saved.clientId) {
        clientIdInput.value = saved.clientId;
    }

    if (saved.mode) {
        paymentModeSelect.value = saved.mode;
        toggleFormFields();
    }

    if (saved.orderId) {
        orderIdInput.value = saved.orderId;
    }

    if (saved.subscriptionId) {
        subscriptionIdInput.value = saved.subscriptionId;
    }
}

/**
 * ANCHOR: Toggle Form Fields Based on Mode
 * @description Show/hide order ID or subscription ID fields based on selected mode
 */
function toggleFormFields() {
    const mode = document.getElementById('paymentMode').value;
    const orderIdGroup = document.getElementById('orderIdGroup');
    const subscriptionIdGroup = document.getElementById('subscriptionIdGroup');

    if (mode === 'order') {
        orderIdGroup.style.display = 'block';
        subscriptionIdGroup.style.display = 'none';
    } else {
        orderIdGroup.style.display = 'none';
        subscriptionIdGroup.style.display = 'block';
    }
}

/**
 * ANCHOR: Handle Form Submission
 * @description Handle configuration form submission and initialize PayPal
 * @param {Event} e - Form submit event
 */
function handleFormSubmit(e) {
    e.preventDefault();

    const clientId = document.getElementById('clientId').value.trim();
    const mode = document.getElementById('paymentMode').value;
    const orderId = document.getElementById('orderId').value.trim();
    const subscriptionId = document.getElementById('subscriptionId').value.trim();

    if (!clientId) {
        alert('Please enter a PayPal Client ID');
        return;
    }

    if (mode === 'order' && !orderId) {
        alert('Please enter an Order ID for Order mode');
        return;
    }

    if (mode === 'recurring' && !subscriptionId) {
        alert('Please enter a Subscription ID for Recurring mode');
        return;
    }

    currentConfig = {
        clientId,
        mode,
        orderId: mode === 'order' ? orderId : null,
        subscriptionId: mode === 'recurring' ? subscriptionId : null,
    };

    // Save to localStorage
    saveToLocalStorage(currentConfig);

    clearResponse();
    renderPayPalButton();
}

/**
 * ANCHOR: Initialize Application
 * @description Set up event listeners and initialize the application
 */
function init() {
    const form = document.getElementById('configForm');
    const paymentMode = document.getElementById('paymentMode');
    const clearBtn = document.getElementById('clearResponse');

    // Load saved configuration and pre-fill form
    loadSavedConfigToForm();

    form.addEventListener('submit', handleFormSubmit);
    paymentMode.addEventListener('change', toggleFormFields);
    clearBtn.addEventListener('click', clearResponse);

    // Auto-save on input change (debounced)
    let saveTimeout = null;
    const inputs = [
        document.getElementById('clientId'),
        document.getElementById('paymentMode'),
        document.getElementById('orderId'),
        document.getElementById('subscriptionId'),
    ];

    inputs.forEach((input) => {
        input.addEventListener('input', () => {
            clearTimeout(saveTimeout);
            saveTimeout = setTimeout(() => {
                const clientId = document.getElementById('clientId').value.trim();
                const mode = document.getElementById('paymentMode').value;
                const orderId = document.getElementById('orderId').value.trim();
                const subscriptionId = document.getElementById('subscriptionId').value.trim();

                if (clientId) {
                    saveToLocalStorage({
                        clientId,
                        mode,
                        orderId: mode === 'order' ? orderId : '',
                        subscriptionId: mode === 'recurring' ? subscriptionId : '',
                    });
                }
            }, 500);
        });
    });

    // Initialize form field visibility
    toggleFormFields();
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}
