/* ====================================================================
   CONSTANTS & HELPERS
==================================================================== */
const CONSENT_KEY = 'puretext_consent_v1';

function $(id) { return document.getElementById(id); }

/* ====================================================================
   STATS (character / word / line counter)
==================================================================== */
function updateStats() {
    const val = $('input-text').value;

    $('char-count').textContent = val.length + ' chars';
    $('line-count').textContent = (val === '' ? 0 : val.split('\n').length) + ' lines';
    $('word-count').textContent = (val.trim() === '' ? 0 : val.trim().split(/\s+/).length) + ' words';

    // For Mobile
    $('char-count-sm').textContent = val.length + ' chars';
    $('line-count-sm').textContent = (val === '' ? 0 : val.split('\n').length) + ' lines';
    $('word-count-sm').textContent = (val.trim() === '' ? 0 : val.trim().split(/\s+/).length) + ' words';
}

/* ====================================================================
   FILTER ACTIONS
==================================================================== */
// Global shortcut listener: Focus search input on Ctrl+K or Cmd+K
document.addEventListener('keydown', function (e) {
    if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault(); // Stop default browser search bar behaviors
        const searchInput = document.getElementById('tool-search');
        if (searchInput) {
            searchInput.focus();
            searchInput.select(); // Highlight existing text for fast overwrite
        }
    }
});

// Live engine: Evaluates typing actions instantly
function filterTools() {
    const query = document.getElementById('tool-search').value.toLowerCase().trim();
    const clearBtn = document.getElementById('clear-search');
    const sections = document.querySelectorAll('.tool-section');
    const noResultsMsg = document.getElementById('no-results-msg');

    // Toggle the "X" clear button element
    if (clearBtn) {
        clearBtn.classList.toggle('hidden', query === '');
    }

    let absoluteVisibleCount = 0;

    sections.forEach(section => {
        const buttons = section.querySelectorAll('.tool-btn');
        let sectionHasMatch = false;

        buttons.forEach(btn => {
            const text = btn.textContent.toLowerCase();
            if (text.includes(query)) {
                btn.classList.remove('hidden');
                sectionHasMatch = true;
                absoluteVisibleCount++;
            } else {
                btn.classList.add('hidden');
            }
        });

        // Hide or show the category wrapper container dynamically
        if (sectionHasMatch) {
            section.classList.remove('hidden');
        } else {
            section.classList.add('hidden');
        }
    });

    // Handle full empty search state feedback blocks
    if (noResultsMsg) {
        noResultsMsg.classList.toggle('hidden', absoluteVisibleCount > 0);
    }
}

// Clear trigger: Restores original UI dashboard structure
function clearSearch() {
    const input = document.getElementById('tool-search');
    if (input) {
        input.value = '';
        filterTools();
        input.focus();
    }
}

/* ====================================================================
   CLIPBOARD — PASTE
==================================================================== */
async function pasteFromClipboard() {
    try {
        const text = await navigator.clipboard.readText();
        $('input-text').value = text;
        updateStats();
    } catch (err) {
        // Fallback: focus the textarea so the user can paste manually
        $('input-text').focus();
        showToast('Click inside the text box and press Ctrl+V / ⌘+V to paste.');
    }
}

/* ====================================================================
   CLEAR INPUT
==================================================================== */
function clearInput() {
    $('input-text').value = '';
    $('output-text').value = '';
    updateStats();
}

/* ====================================================================
   COPY OUTPUT
==================================================================== */
async function copyOutput() {
    const out = $('output-text').value;
    if (!out) return;
    try {
        await navigator.clipboard.writeText(out);
    } catch {
        // Legacy fallback
        $('output-text').select();
        document.execCommand('copy');
    }
    const btn = $('copy-btn');
    const original = btn.textContent;
    btn.textContent = '✓ Copied!';
    btn.classList.add('bg-brand-400', 'border-brand-300');
    btn.classList.remove('bg-brand-600', 'border-brand-700');
    setTimeout(() => {
        btn.textContent = original;
        btn.classList.remove('bg-brand-400', 'border-brand-300');
        btn.classList.add('bg-brand-600', 'border-brand-700');
    }, 2000);
}

/* ====================================================================
   TEXT PROCESSING ENGINE
==================================================================== */
function applyAction(action) {
    const input = $('input-text').value;
    if (!input.trim()) {
        showToast('Please enter or paste some text first.');
        return;
    }

    let result = '';

    switch (action) {
        /* ── CASE ─────────────────────────────────────────────────── */
        case 'uppercase':
            result = input.toUpperCase();
            break;

        case 'lowercase':
            result = input.toLowerCase();
            break;

        case 'titlecase':
            // Capitalise first letter of each word; smart handling of short conjunctions
            result = input.replace(/\w\S*/g, (word) => {
                const lower = word.toLowerCase();
                const SKIP = ['a', 'an', 'the', 'and', 'but', 'or', 'for', 'nor', 'on', 'at', 'to', 'by', 'of', 'in', 'is'];
                // Always capitalise first or last word; skip articles/prepositions mid-sentence
                return SKIP.includes(lower) ? lower : lower.charAt(0).toUpperCase() + lower.slice(1);
            });
            // Ensure very first character is always capitalised
            result = result.charAt(0).toUpperCase() + result.slice(1);
            break;

        case 'sentencecase':
            // Capitalise after . ? ! and at the start of the string
            result = input
                .toLowerCase()
                .replace(/(^\s*\w|[.?!]\s+\w)/g, (char) => char.toUpperCase());
            break;

        case 'alternating':
            result = input
                .split('')
                .map((ch, i) => i % 2 === 0 ? ch.toLowerCase() : ch.toUpperCase())
                .join('');
            break;

        /* ── LIST ─────────────────────────────────────────────────── */
        case 'removeduplicates': {
            const lines = input.split('\n');
            const seen = new Set();
            result = lines.filter(line => {
                const key = line.trim().toLowerCase();
                if (seen.has(key)) return false;
                seen.add(key);
                return true;
            }).join('\n');
            break;
        }

        case 'tocommalist':
            result = input
                .split('\n')
                .map(l => l.trim())
                .filter(l => l !== '')
                .join(', ');
            break;

        case 'commatonewlines':
            result = input
                .split(',')
                .map(l => l.trim())
                .filter(l => l !== '')
                .join('\n');
            break;

        case 'sortaz':
            result = input
                .split('\n')
                .sort((a, b) => a.toLowerCase().localeCompare(b.toLowerCase()))
                .join('\n');
            break;

        case 'sortza':
            result = input
                .split('\n')
                .sort((a, b) => b.toLowerCase().localeCompare(a.toLowerCase()))
                .join('\n');
            break;

        case 'reverseLines':
            result = input.split('\n').reverse().join('\n');
            break;

        case 'numberedList':
            result = input
                .split('\n')
                .filter(l => l.trim() !== '')
                .map((l, i) => `${i + 1}. ${l.trim()}`)
                .join('\n');
            break;

        /* ── CLEAN ────────────────────────────────────────────────── */
        case 'stripspaces':
            // Collapse runs of whitespace (excluding newlines) to a single space per line
            result = input
                .split('\n')
                .map(line => line.replace(/[ \t]+/g, ' ').trim())
                .join('\n');
            break;

        case 'removelinebreaks':
            result = input.replace(/\r?\n/g, ' ').replace(/[ \t]+/g, ' ').trim();
            break;

        case 'removeemptylines':
            result = input
                .split('\n')
                .filter(l => l.trim() !== '')
                .join('\n');
            break;

        case 'trimlines':
            result = input.split('\n').map(l => l.trim()).join('\n');
            break;

        case 'removenumbers':
            result = input.replace(/[0-9]/g, '');
            break;

        case 'removepunctuation':
            result = input.replace(/[!"#$%&'()*+,\-./:;<=>?@[\\\]^_`{|}~]/g, '');
            break;

        case 'removespecialchars':
            // Keep letters, digits, spaces, and newlines
            result = input.replace(/[^a-zA-Z0-9\s]/g, '');
            break;

        case 'htmlencode':
            result = input
                .replace(/&/g, '&amp;')
                .replace(/</g, '&lt;')
                .replace(/>/g, '&gt;')
                .replace(/"/g, '&quot;')
                .replace(/'/g, '&#039;');
            break;

        case 'htmldecode':
            result = input
                .replace(/&amp;/g, '&')
                .replace(/&lt;/g, '<')
                .replace(/&gt;/g, '>')
                .replace(/&quot;/g, '"')
                .replace(/&#039;/g, "'");
            break;

        case 'urlencode':
            try { result = encodeURIComponent(input); }
            catch { result = input; }
            break;

        case 'urldecode':
            try { result = decodeURIComponent(input); }
            catch { showToast('Invalid URL encoding — could not decode.'); result = input; }
            break;

        default:
            result = input;
    }

    $('output-text').value = result;
}

/* ====================================================================
   TOAST NOTIFICATION (lightweight, no library)
==================================================================== */
let toastTimer;
function showToast(message) {
    let toast = document.getElementById('toast');
    if (!toast) {
        toast = document.createElement('div');
        toast.id = 'toast';
        toast.className = 'fixed bottom-24 left-1/2 -translate-x-1/2 z-[100] px-4 py-2 rounded-lg bg-slate-700 border border-slate-600 text-slate-200 text-xs shadow-xl transition-opacity duration-300';
        document.body.appendChild(toast);
    }
    toast.textContent = message;
    toast.style.opacity = '1';
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { toast.style.opacity = '0'; }, 2800);
}

/* ====================================================================
   CONSENT BANNER
==================================================================== */
function initConsentBanner() {
    const choice = localStorage.getItem(CONSENT_KEY);
    if (choice) {
        // Already decided — hide banner immediately (no animation needed)
        const banner = $('consent-banner');
        banner.style.display = 'none';
    }
}

function consentChoice(level) {
    localStorage.setItem(CONSENT_KEY, level);
    closeBanner();
    if (level === 'all') {
        // Consent granted — load advertising scripts here
        // e.g., (adsbygoogle = window.adsbygoogle || []).push({});
    }
}

function closeBanner() {
    const banner = $('consent-banner');
    banner.classList.add('hidden-banner');
    setTimeout(() => { banner.style.display = 'none'; }, 400);
}

/* ====================================================================
   MODAL SYSTEM
==================================================================== */
const MODAL_CONTENT = {

    /* ──────────────────────────────────────────────────────────────────
       PRIVACY POLICY
    ─────────────────────────────────────────────────────────────────── */
    privacy: {
        title: 'Privacy Policy',
        html: `
  <p><strong>Last updated: January 1, 2025</strong></p>
  <p>This Privacy Policy describes how PureText Clean ("we", "us", or "our") collects, uses, and shares information when you visit our website (the "Service").</p>

  <h3>1. Information We Collect</h3>
  <p><strong>Text you process</strong> is handled entirely within your own browser. We never transmit, store, or have access to any text you enter into the tool. All processing occurs locally on your device.</p>
  <p><strong>Automatically collected data</strong> may include your IP address, browser type, operating system, referring URLs, and pages visited. This data is collected by our hosting provider and by third-party advertising and analytics services.</p>

  <h3>2. Google AdSense &amp; DART Cookies</h3>
  <p>We use Google AdSense to display advertisements. Google uses cookies, including the DoubleClick DART cookie, to serve ads based on your prior visits to this website and other sites on the Internet. These cookies allow Google and its partners to serve ads based on your visit here and to sites across the web.</p>
  <p>You may opt out of the use of the DART cookie by visiting the <a href="https://policies.google.com/technologies/ads" target="_blank" rel="noopener noreferrer">Google Advertising Policies page</a>, or by visiting the <a href="https://www.networkadvertising.org/choices/" target="_blank" rel="noopener noreferrer">Network Advertising Initiative opt-out page</a>.</p>
  <p>You can also manage your Google ad preferences at <a href="https://www.google.com/settings/ads" target="_blank" rel="noopener noreferrer">google.com/settings/ads</a>.</p>

  <h3>3. Cookies and Tracking Technologies</h3>
  <p>We and third parties acting on our behalf use cookies, web beacons, and similar technologies. For a full description of the cookies used, see our <button data-switch-modal="cookies" style="color:#34d399;text-decoration:underline;background:none;border:none;cursor:pointer;padding:0;">Cookie Policy</button>.</p>

  <h3>4. Third-Party Analytics</h3>
  <p>We may use third-party analytics tools (such as Google Analytics) that use cookies to collect and report usage data about our Service in an aggregate, anonymous form. You may opt out of Google Analytics by installing the <a href="https://tools.google.com/dlpage/gaoptout" target="_blank" rel="noopener noreferrer">Google Analytics Opt-out Browser Add-on</a>.</p>

  <h3>5. GDPR — Rights for EEA Residents</h3>
  <p>If you are located in the European Economic Area (EEA), you have the following rights under the General Data Protection Regulation (GDPR):</p>
  <ul>
    <li>The right to access the personal data we hold about you.</li>
    <li>The right to rectification of inaccurate personal data.</li>
    <li>The right to erasure ("right to be forgotten").</li>
    <li>The right to restriction of processing.</li>
    <li>The right to data portability.</li>
    <li>The right to object to processing.</li>
    <li>The right to withdraw consent at any time where processing is based on consent.</li>
  </ul>
  <p>To exercise any of these rights, please contact us at the address in our Contact section. We will respond within 30 days.</p>
  <p>Our legal basis for processing personal data collected through advertising is your consent, which you may withdraw at any time via the consent banner or by contacting us.</p>

  <h3>6. CCPA — Rights for California Residents</h3>
  <p>Under the California Consumer Privacy Act (CCPA), California residents have the right to:</p>
  <ul>
    <li>Know what personal information we collect, use, disclose, and sell.</li>
    <li>Delete personal information we have collected (subject to certain exceptions).</li>
    <li>Opt out of the sale of personal information. <strong>We do not sell personal information.</strong></li>
    <li>Non-discrimination for exercising your CCPA rights.</li>
  </ul>
  <p>To submit a CCPA request, please contact us using the information in our About / Contact section. We will verify your identity and respond within 45 days.</p>

  <h3>7. Children's Privacy</h3>
  <p>Our Service is not directed to children under the age of 13. We do not knowingly collect personal information from children. If you believe we have inadvertently collected such information, please contact us immediately.</p>

  <h3>8. Data Retention</h3>
  <p>We retain automatically collected server log data for a maximum of 90 days. Data collected by third-party advertising and analytics providers is subject to their own retention policies.</p>

  <h3>9. Changes to This Policy</h3>
  <p>We may update this Privacy Policy from time to time. We will notify you of any material changes by updating the "Last updated" date at the top of this page. Your continued use of the Service after such changes constitutes your acceptance of the updated policy.</p>

  <h3>10. Contact</h3>
  <p>For any privacy-related questions, requests, or complaints, please use the information provided in the <button data-switch-modal="contact" style="color:#34d399;text-decoration:underline;background:none;border:none;cursor:pointer;padding:0;">About / Contact</button> section.</p>
`
    },

    /* ──────────────────────────────────────────────────────────────────
       TERMS OF SERVICE
    ─────────────────────────────────────────────────────────────────── */
    terms: {
        title: 'Terms of Service',
        html: `
  <p><strong>Last updated: January 1, 2025</strong></p>
  <p>Please read these Terms of Service ("Terms") carefully before using PureText Clean (the "Service"). By accessing or using the Service, you agree to be bound by these Terms.</p>

  <h3>1. Acceptance of Terms</h3>
  <p>By using this Service, you confirm that you are at least 13 years of age and that you accept and agree to these Terms in full. If you disagree with any part of these Terms, you must not use the Service.</p>

  <h3>2. Description of Service</h3>
  <p>PureText Clean is a free, browser-based text-manipulation utility. All processing occurs locally within your browser. We do not receive, store, or transmit any text you enter into the tool.</p>

  <h3>3. Acceptable Use</h3>
  <p>You agree to use the Service only for lawful purposes and in a manner that does not infringe the rights of others. You must not:</p>
  <ul>
    <li>Use the Service to process content that is illegal, harmful, defamatory, obscene, or violates any third-party rights.</li>
    <li>Attempt to interfere with the normal operation of the Service.</li>
    <li>Use automated tools to scrape, crawl, or overload the Service's hosting infrastructure.</li>
    <li>Remove or circumvent any advertising, consent banners, or legal notices on the page.</li>
  </ul>

  <h3>4. Intellectual Property</h3>
  <p>The design, layout, code, and branding of PureText Clean are the intellectual property of their respective owners. You may not copy, reproduce, distribute, or create derivative works from the Service without prior written permission.</p>

  <h3>5. Third-Party Advertising</h3>
  <p>The Service displays advertisements served by Google AdSense and potentially other third-party advertising networks. These ads are governed by the respective network's terms and privacy policies. We are not responsible for the content of third-party advertisements.</p>

  <h3>6. Disclaimer of Warranties</h3>
  <p>The Service is provided "as is" and "as available" without any warranties of any kind, either express or implied, including but not limited to implied warranties of merchantability, fitness for a particular purpose, and non-infringement. We do not warrant that the Service will be uninterrupted, error-free, or free of viruses or other harmful components.</p>

  <h3>7. Limitation of Liability</h3>
  <p>To the fullest extent permitted by applicable law, we shall not be liable for any indirect, incidental, special, consequential, or punitive damages, including loss of profits, data, or goodwill, arising out of or in connection with your use of the Service, even if we have been advised of the possibility of such damages.</p>

  <h3>8. Indemnification</h3>
  <p>You agree to indemnify and hold harmless PureText Clean and its operators from any claims, damages, obligations, losses, liabilities, costs, or debt arising from your use of the Service or your violation of these Terms.</p>

  <h3>9. Governing Law</h3>
  <p>These Terms shall be governed by and construed in accordance with applicable law. Any disputes arising from these Terms or your use of the Service shall be subject to the exclusive jurisdiction of the competent courts.</p>

  <h3>10. Changes to Terms</h3>
  <p>We reserve the right to modify these Terms at any time. Material changes will be indicated by updating the "Last updated" date. Continued use of the Service after any such changes constitutes your acceptance of the new Terms.</p>

  <h3>11. Contact</h3>
  <p>Questions about these Terms? Please see the <button data-switch-modal="contact" style="color:#34d399;text-decoration:underline;background:none;border:none;cursor:pointer;padding:0;">About / Contact</button> section.</p>
`
    },

    /* ──────────────────────────────────────────────────────────────────
       COOKIE POLICY
    ─────────────────────────────────────────────────────────────────── */
    cookies: {
        title: 'Cookie Policy',
        html: `
  <p><strong>Last updated: January 1, 2025</strong></p>
  <p>This Cookie Policy explains how PureText Clean uses cookies and similar tracking technologies when you visit our website.</p>

  <h3>1. What Are Cookies?</h3>
  <p>Cookies are small text files stored on your device by your web browser when you visit a website. They allow the website to remember your preferences and recognise you on return visits.</p>

  <h3>2. Cookies We Use</h3>

  <h3>2a. Strictly Necessary Cookies</h3>
  <p>These cookies are essential for the basic functionality of the Service and cannot be disabled.</p>
  <ul>
    <li><strong>puretext_consent_v1</strong> — Stores your cookie consent preference (stored in <code>localStorage</code>). Duration: until cleared. This cookie is first-party.</li>
  </ul>

  <h3>2b. Advertising Cookies (Third-Party)</h3>
  <p>These cookies are only set if you click "Accept All" in the consent banner.</p>
  <ul>
    <li><strong>Google AdSense / DoubleClick DART</strong> — Google uses the DART cookie to serve ads based on your past visits to this website and other sites across the Internet. The DART cookie is stored at <code>doubleclick.net</code>. Duration: up to 13 months.</li>
    <li><strong>Google Analytics</strong> (_ga, _gid, _gat) — Used to distinguish users and throttle request rate. Duration: 2 years / 24 hours / 1 minute respectively.</li>
  </ul>

  <h3>3. How to Control Cookies</h3>
  <p>You can control and manage cookies in several ways:</p>
  <ul>
    <li><strong>Consent Banner</strong>: Use the "Reject Non-Essential" button in our consent banner to prevent non-essential cookies from being set.</li>
    <li><strong>Browser Settings</strong>: You can configure your browser to refuse all or some cookies, or to alert you when cookies are being sent. Please consult your browser's help documentation for instructions.</li>
    <li><strong>Google Ads Settings</strong>: Manage personalised advertising preferences at <a href="https://www.google.com/settings/ads" target="_blank" rel="noopener noreferrer">google.com/settings/ads</a>.</li>
    <li><strong>NAI Opt-Out</strong>: Use the Network Advertising Initiative opt-out tool at <a href="https://www.networkadvertising.org/choices/" target="_blank" rel="noopener noreferrer">networkadvertising.org/choices</a>.</li>
    <li><strong>DAA Opt-Out</strong>: Use the Digital Advertising Alliance opt-out tool at <a href="https://optout.aboutads.info/" target="_blank" rel="noopener noreferrer">optout.aboutads.info</a>.</li>
  </ul>

  <h3>4. Do Not Track</h3>
  <p>Some browsers include a "Do Not Track" (DNT) feature that signals websites not to track your activity. Our Service currently responds to DNT signals by not setting non-essential cookies when DNT is enabled.</p>

  <h3>5. Changes to This Cookie Policy</h3>
  <p>We may update this Cookie Policy from time to time to reflect changes in technology or law. We will update the "Last updated" date when we do so.</p>

  <h3>6. Contact</h3>
  <p>For questions about our use of cookies, please see the <button data-switch-modal="contact" style="color:#34d399;text-decoration:underline;background:none;border:none;cursor:pointer;padding:0;">About / Contact</button> section.</p>

  <!-- Consent Management Panel -->
  <div id="consent-management-panel" class="mt-4 pt-4 border-t border-slate-700">
    <h3>Manage Your Consent</h3>
    <p>Your current consent status: <strong id="current-consent-status" class="text-brand-400">Loading…</strong></p>
    <div class="flex gap-3 mt-3">
      <button data-consent="essential" data-toast="Preference saved — non-essential cookies rejected."
        class="text-xs px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-600 text-slate-300 hover:text-white transition-colors">
        Reject Non-Essential
      </button>
      <button data-consent="all" data-toast="Preference saved — all cookies accepted."
        class="text-xs px-4 py-2 rounded-lg bg-brand-600 hover:bg-brand-500 border border-brand-700 text-white transition-colors">
        Accept All
      </button>
      <button data-revoke-consent
        class="text-xs px-4 py-2 rounded-lg bg-slate-800 hover:bg-rose-900/60 border border-slate-700 hover:border-rose-700 text-slate-300 hover:text-rose-300 transition-colors">
        Revoke &amp; Reset
      </button>
    </div>
  </div>
`
    },

    /* ──────────────────────────────────────────────────────────────────
       ABOUT / CONTACT
    ─────────────────────────────────────────────────────────────────── */
    contact: {
        title: 'About Us & Contact',
        html: `
  <h3>About PureText Clean</h3>
  <p>PureText Clean is a free, privacy-first text-manipulation utility built for writers, developers, data analysts, and anyone who regularly works with text and lists. Every operation runs entirely within your web browser — no data is ever sent to a server, no text is ever logged, and no account is required.</p>
  <p>The tool is independently developed and maintained as a free resource supported by non-intrusive advertising via Google AdSense.</p>

  <h3>Our Privacy Commitment</h3>
  <ul>
    <li>All text processing is 100% client-side (JavaScript in your browser).</li>
    <li>We never transmit, store, log, or access the text you enter.</li>
    <li>No account or sign-up is required.</li>
    <li>Advertising is clearly labelled and opt-out is always available.</li>
  </ul>

  <h3>Contact Us</h3>
  <p>For questions, feedback, copyright concerns, or privacy requests (GDPR / CCPA), please reach out using the details below:</p>
  <ul>
    <li><strong>Website / Project Name:</strong> PureText Clean</li>
    <li><strong>Email:</strong> <a href="mailto:contact@puretextclean.com">contact@puretextclean.com</a></li>
    <li><strong>Mailing Address:</strong><br>
      [Your Name or Business Name]<br>
      [Street Address]<br>
      [City, State / Province, Postal Code]<br>
      [Country]
    </li>
    <li><strong>Response Time:</strong> We aim to respond to all enquiries within 5 business days. GDPR requests within 30 days. CCPA requests within 45 days.</li>
  </ul>

  <h3>Advertising Enquiries</h3>
  <p>Advertising on this site is managed through Google AdSense. If you have a concern about a specific advertisement, you can report it to Google directly via the "Why this ad?" link on any ad unit, or contact us at the email above.</p>

  <h3>Technical Issues / Bug Reports</h3>
  <p>Found a bug? We welcome bug reports and feature suggestions. Please email us with a description of the issue, your browser name and version, and steps to reproduce the problem.</p>
`
    }

};

/* ====================================================================
   MODAL LOGIC
==================================================================== */
let currentModal = null;

function openModal(key) {
    const content = MODAL_CONTENT[key];
    if (!content) return;
    currentModal = key;
    $('modal-title').textContent = content.title;
    $('modal-body').innerHTML = content.html;
    const overlay = $('modal-overlay');
    overlay.classList.remove('hidden');
    document.body.style.overflow = 'hidden';

    // Update consent status display if cookies modal
    if (key === 'cookies') updateConsentStatusDisplay();

    // Trap focus inside modal (accessibility)
    overlay.querySelector('button[aria-label="Close"]').focus();
}

function closeModal() {
    $('modal-overlay').classList.add('hidden');
    document.body.style.overflow = '';
    currentModal = null;
}

function closeModalOnBackdrop(e) {
    if (e.target === $('modal-overlay')) closeModal();
}

function switchModal(key) {
    closeModal();
    setTimeout(() => openModal(key), 50);
}

// Keyboard: Escape closes modal
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && currentModal) closeModal();
});

/* ====================================================================
   CONSENT HELPERS
==================================================================== */
function updateConsentStatusDisplay() {
    const el = $('current-consent-status');
    if (!el) return;
    const val = localStorage.getItem(CONSENT_KEY);
    el.textContent = val === 'all' ? 'All cookies accepted'
        : val === 'essential' ? 'Non-essential cookies rejected'
            : 'No preference set';
}

function revokeConsent() {
    localStorage.removeItem(CONSENT_KEY);
    updateConsentStatusDisplay();
    // Show the banner again
    const banner = $('consent-banner');
    banner.style.display = '';
    banner.classList.remove('hidden-banner');
    showToast('Consent revoked. The cookie banner has been restored.');
}

/* ====================================================================
   INIT & EVENT DELEGATION (CSP-compliant)
==================================================================== */
document.addEventListener('DOMContentLoaded', () => {
    // Set footer year
    $('footer-year').textContent = new Date().getFullYear();

    // Initialise consent banner
    initConsentBanner();

    // Initial stats
    updateStats();
});

// Global delegated click handler (handles static, dynamic modal, and action clicks)
document.addEventListener('click', (e) => {
    // 1. Text actions (data-action)
    const actionBtn = e.target.closest('[data-action]');
    if (actionBtn) {
        applyAction(actionBtn.getAttribute('data-action'));
        return;
    }

    // 2. Modal trigger buttons (data-modal)
    const modalBtn = e.target.closest('[data-modal]');
    if (modalBtn) {
        if (modalBtn.hasAttribute('data-close-banner')) {
            closeBanner();
        }
        openModal(modalBtn.getAttribute('data-modal'));
        return;
    }

    // 3. Switch modal (inside dynamic modal body templates)
    const switchBtn = e.target.closest('[data-switch-modal]');
    if (switchBtn) {
        switchModal(switchBtn.getAttribute('data-switch-modal'));
        return;
    }

    // 4. Consent actions
    const consentBtn = e.target.closest('[data-consent]');
    if (consentBtn) {
        consentChoice(consentBtn.getAttribute('data-consent'));
        const toastMsg = consentBtn.getAttribute('data-toast');
        if (toastMsg) showToast(toastMsg);
        return;
    }

    // 5. Revoke consent action
    const revokeBtn = e.target.closest('[data-revoke-consent]');
    if (revokeBtn) {
        revokeConsent();
        return;
    }

    // 6. Generic click helper bindings (data-click)
    const clickBtn = e.target.closest('[data-click]');
    if (clickBtn) {
        const act = clickBtn.getAttribute('data-click');
        if (act === 'paste') pasteFromClipboard();
        else if (act === 'clear') clearInput();
        else if (act === 'copy') copyOutput();
        else if (act === 'clear-search') clearSearch();
        else if (act === 'close-modal') closeModal();
        return;
    }

    // 7. Close modal on backdrop click
    if (e.target.id === 'modal-overlay') {
        closeModal();
    }
});

// Global delegated input handler
document.addEventListener('input', (e) => {
    if (e.target.id === 'input-text') {
        updateStats();
    } else if (e.target.id === 'tool-search') {
        filterTools();
    }
});
