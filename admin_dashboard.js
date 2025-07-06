document.addEventListener('authReady', (event) => {
    console.log("Auth is ready, initializing Admin Dashboard script.");
    const user = event.detail.user;

    // --- DOM References ---
    const pendingLawyersTable = document.getElementById('pendingLawyersTable');
    const acceptedLawyersTable = document.getElementById('acceptedLawyersTable');
    const declinedLawyersTable = document.getElementById('declinedLawyersTable');
    const pendingClientsTable = document.getElementById('pendingClientsTable');
    const acceptedClientsTable = document.getElementById('acceptedClientsTable');
    const declinedClientsTable = document.getElementById('declinedClientsTable');

    const sectionLinks = document.querySelectorAll('.sidebar nav li a');
    const sections = document.querySelectorAll('.main-content .section');
    const detailModal = document.getElementById('detailModal');
    const modalTitle = document.getElementById('modalTitle');
    const modalDetailsPre = document.getElementById('modalDetails');
    const modalIdImage = document.getElementById('modalIdImage');
    const modalFaceImage = document.getElementById('modalFaceImage');
    const modalCloseBtn = document.querySelector('.modal-close');

    let listeners = [];

    // --- Main Initialization ---
    function initializeDashboard() {
        if (!user) {
            console.error("Dashboard Init Error: User object not available.");
            return;
        }
        const userEmailSpan = document.getElementById('user-email');
        if (userEmailSpan) userEmailSpan.textContent = `Logged in: ${user.email}`;

        setupEventListeners();
        showSection('lawyerApprovalSection'); // Default to Lawyer Approval view
        attachFirestoreListeners();
        console.log("Admin Dashboard Initialized Successfully.");
    }

    function setupEventListeners() {
        sectionLinks.forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                sectionLinks.forEach(l => l.classList.remove('active'));
                link.classList.add('active');
                const sectionId = link.getAttribute('href').substring(1);
                showSection(sectionId);
            });
        });
        if (modalCloseBtn) modalCloseBtn.onclick = () => closeModal();
    }

    function showSection(sectionId) {
        sections.forEach(section => {
            section.style.display = (section.id === sectionId) ? 'block' : 'none';
        });
    }

    function attachFirestoreListeners() {
        detachFirestoreListeners();
        const addListener = (query, tableBody, rowPopulator, context) => {
            if (tableBody) {
                listeners.push(query.onSnapshot(
                    (snapshot) => handleSnapshot(snapshot, tableBody, rowPopulator, context),
                    (error) => handleSnapshotError(error, context)
                ));
            } else {
                console.warn(`Table body for '${context}' not found. Skipping listener.`);
            }
        };

        // Lawyer Queries
        const pendingLawyersQuery = db.collection("lawyers").where("accountStatus", "==", "Pending").orderBy("createdAt", "desc");
        const acceptedLawyersQuery = db.collection("lawyers").where("accountStatus", "==", "Accepted").orderBy("adminProcessedAt", "desc").limit(50);
        const declinedLawyersQuery = db.collection("lawyers").where("accountStatus", "==", "Declined").orderBy("adminProcessedAt", "desc").limit(50);
        
        // Client Queries
        const pendingClientsQuery = db.collection("client_verifications").where("status", "==", "Pending").orderBy("timestamp", "desc");
        const acceptedClientsQuery = db.collection("client_verifications").where("status", "==", "Verified").orderBy("adminProcessedAt", "desc").limit(50);
        const declinedClientsQuery = db.collection("client_verifications").where("status", "==", "Declined").orderBy("adminProcessedAt", "desc").limit(50);

        // Attach all listeners
        addListener(pendingLawyersQuery, pendingLawyersTable, populatePendingLawyerRow, "pending lawyers");
        addListener(acceptedLawyersQuery, acceptedLawyersTable, populateProcessedLawyerRow, "accepted lawyers");
        addListener(declinedLawyersQuery, declinedLawyersTable, populateProcessedLawyerRow, "declined lawyers");
        addListener(pendingClientsQuery, pendingClientsTable, populatePendingClientRow, "pending clients");
        addListener(acceptedClientsQuery, acceptedClientsTable, populateProcessedClientRow, "accepted clients");
        addListener(declinedClientsQuery, declinedClientsTable, populateProcessedClientRow, "declined clients");
    }

    function detachFirestoreListeners() {
        console.log(`Detaching ${listeners.length} listeners.`);
        listeners.forEach(unsubscribe => unsubscribe());
        listeners = [];
    }

    function handleSnapshot(snapshot, tableBody, rowPopulator, context) {
        console.log(`Snapshot for [${context}]: ${snapshot.size} items.`);
        tableBody.innerHTML = '';
        if (snapshot.empty) {
            const colSpan = tableBody.closest('table')?.querySelector('thead tr')?.childElementCount || 7;
            tableBody.innerHTML = `<tr><td colspan="${colSpan}">No items found.</td></tr>`;
            return;
        }
        snapshot.forEach(doc => rowPopulator(doc, tableBody));
    }

    function handleSnapshotError(error, context) {
        console.error(`Error fetching [${context}]: `, error);
        if (error.code === 'failed-precondition') {
            alert(`Error: A database index is missing for the '${context}' section. Check console for the creation link.`);
        }
    }

    // --- Row Population ---
    function populatePendingLawyerRow(doc, tableBody) {
        const data = doc.data();
        const lawyerId = doc.id;
        const row = tableBody.insertRow();
        row.innerHTML = `
            <td data-label="Lawyer Name">${data.fullName || 'N/A'}</td>
            <td data-label="Email">${data.emailAddress || 'N/A'}</td>
            <td data-label="Submitted">${data.createdAt?.toDate().toLocaleDateString() || 'N/A'}</td>
            <td data-label="IBP ID">${data.ibpIdUrl ? `<button class="btn view" onclick="viewImage('${data.ibpIdUrl}')">View</button>` : 'N/A'}</td>
            <td data-label="Face Photo">${data.facePhotoUrl ? `<button class="btn view" onclick="viewImage('${data.facePhotoUrl}')">View</button>` : 'N/A'}</td>
            <td data-label="Details"><button class="btn view" data-doc='${JSON.stringify(data)}' onclick='showDetailsModal(this.dataset.doc, "lawyer")'>View</button></td>
            <td data-label="Action">
                <button class="btn accept" onclick="processLawyerApproval('${lawyerId}', true)">Accept</button>
                <button class="btn decline" onclick="processLawyerApproval('${lawyerId}', false)">Decline</button>
            </td>`;
    }

    function populateProcessedLawyerRow(doc, tableBody) {
        const data = doc.data();
        const row = tableBody.insertRow();

        let cells = '';
        if (data.accountStatus === 'Declined') {
            cells = `
                <td data-label="Lawyer Name">${data.fullName || 'N/A'}</td>
                <td data-label="Email">${data.emailAddress || 'N/A'}</td>
                <td data-label="Declined At">${data.adminProcessedAt?.toDate().toLocaleString() || 'N/A'}</td>
                <td data-label="Declined By">${data.adminProcessor || 'N/A'}</td>
                <td data-label="Reason">${data.adminNotes || ''}</td>
            `;
        } else { // Accepted
            cells = `
                <td data-label="Lawyer Name">${data.fullName || 'N/A'}</td>
                <td data-label="Email">${data.emailAddress || 'N/A'}</td>
                <td data-label="Law Firm">${data.lawFirmName || 'Individual'}</td>
                <td data-label="Accepted At">${data.adminProcessedAt?.toDate().toLocaleString() || 'N/A'}</td>
                <td data-label="Accepted By">${data.adminProcessor || 'N/A'}</td>
            `;
        }
        row.innerHTML = cells;
    }

    function populatePendingClientRow(doc, tableBody) {
        const data = doc.data();
        const docId = doc.id;
        const clientId = data.userId;
        if (!clientId) return;
        const row = tableBody.insertRow();
        db.collection("users").doc(clientId).get().then(userDoc => {
            const clientName = userDoc.exists ? userDoc.data().fullName : "Unknown Client";
            row.innerHTML = `
                <td data-label="Client Name">${clientName}</td>
                <td data-label="Submitted">${data.timestamp?.toDate().toLocaleDateString() || 'N/A'}</td>
                <td data-label="ID Type">${data.idType || 'N/A'}</td>
                <td data-label="ID Img">${data.idFileUrl ? `<button class="btn view" onclick="viewImage('${data.idFileUrl}')">View</button>` : 'N/A'}</td>
                <td data-label="Face Img">${data.faceFileUrl ? `<button class="btn view" onclick="viewImage('${data.faceFileUrl}')">View</button>` : 'N/A'}</td>
                <td data-label="Details"><button class="btn view" data-doc='${JSON.stringify(data)}' onclick='showDetailsModal(this.dataset.doc, "client")'>View</button></td>
                <td data-label="Action">
                    <button class="btn accept" onclick="processClientVerification('${docId}', '${clientId}', true)">Accept</button>
                    <button class="btn decline" onclick="processClientVerification('${docId}', '${clientId}', false)">Decline</button>
                </td>`;
        }).catch(() => { row.innerHTML = `<td colspan="7">Error loading client: ${clientId}</td>`; });
    }

    function populateProcessedClientRow(doc, tableBody) {
        const data = doc.data();
        const clientId = data.userId;
        const row = tableBody.insertRow();
        db.collection("users").doc(clientId).get().then(userDoc => {
            const clientName = userDoc.exists ? userDoc.data().fullName : "Unknown Client";
            let cells = '';
            if (data.status === 'Declined') {
                cells = `
                    <td data-label="Client Name">${clientName}</td>
                    <td data-label="ID Type">${data.idType || 'N/A'}</td>
                    <td data-label="Declined At">${data.adminProcessedAt?.toDate().toLocaleString() || 'N/A'}</td>
                    <td data-label="Declined By">${data.adminProcessor || 'N/A'}</td>
                    <td data-label="Reason">${data.adminNotes || ''}</td>`;
            } else { // Verified
                cells = `
                    <td data-label="Client Name">${clientName}</td>
                    <td data-label="ID Type">${data.idType || 'N/A'}</td>
                    <td data-label="Verified At">${data.adminProcessedAt?.toDate().toLocaleString() || 'N/A'}</td>
                    <td data-label="Verified By">${data.adminProcessor || 'N/A'}</td>`;
            }
            row.innerHTML = cells;
        }).catch(err => { row.innerHTML = `<td colspan="4">Error loading client name for ID ${clientId}</td>`; });
    }


    window.processClientVerification = function(verificationDocId, clientId, isAccepted) {
        if (!auth.currentUser) { alert("Admin not logged in!"); return; }
        
        const newStatus = isAccepted ? "Verified" : "Declined";
        let adminNotes = "";
        if (!isAccepted) { adminNotes = prompt(`Reason for declining client verification:`); if (adminNotes === null) return; }

        const verificationRef = db.collection("client_verifications").doc(verificationDocId);
        const userRef = db.collection("users").doc(clientId);
        
        const batch = db.batch();
        batch.update(verificationRef, { status: newStatus, adminProcessor: auth.currentUser.email, adminProcessedAt: firebase.firestore.FieldValue.serverTimestamp(), adminNotes: adminNotes });
        batch.update(userRef, { verificationStatus: newStatus });
        
        batch.commit()
            .then(() => alert(`Client verification has been ${newStatus.toLowerCase()}.`))
            .catch(error => { console.error("Error processing client verification:", error); alert(`Error: ${error.message}`); });
    }

    // --- Modal & Image View ---
    window.showDetailsModal = function(docString, userType) {
        const data = JSON.parse(docString);
        modalTitle.textContent = userType === 'client' ? "Client Verification Details" : "Lawyer Application Details";
        let detailsText = '';

        if (userType === 'client') {
            detailsText += `Client User ID: ${data.userId || 'N/A'}\n`;
            detailsText += `ID Type: ${data.idType || 'N/A'}\n\n`;
            detailsText += `--- Extracted Details ---\n`;
            detailsText += `ID Number: ${data.idNumber || 'N/A'}\n`;
            detailsText += `Last Name: ${data.lastName || 'N/A'}\n`;
            detailsText += `First Name: ${data.firstName || 'N/A'}\n`;
            detailsText += `Middle Name: ${data.middleName || 'N/A'}\n`;
        } else { // Lawyer
            detailsText += `Name: ${data.fullName || 'N/A'}\n`;
            detailsText += `Email: ${data.emailAddress || 'N/A'}\n\n`;
            detailsText += `Law Firm: ${data.lawFirmName || 'N/A'}\n`;
            detailsText += `Firm Address: ${data.lawFirmAddress || 'N/A'}\n\n`;
            const specializations = (data.legalSpecializations || []).map(s => `- ${s.specialization}: ${s.subcategories.join(', ')}`).join('\n');
            detailsText += `Specializations:\n${specializations}`;
        }
        
        modalDetailsPre.textContent = detailsText;
        modalIdImage.src = data.ibpIdUrl || data.idFileUrl || 'placeholder.png'; // Use correct URL field
        modalFaceImage.src = data.facePhotoUrl || data.faceFileUrl || 'placeholder.png'; // Use correct URL field
        if(detailModal) detailModal.style.display = 'flex';
    }

    window.closeModal = function() { if(detailModal) detailModal.style.display = 'none'; }
    window.viewImage = function(imageUrl) { if(imageUrl) window.open(imageUrl, '_blank'); }

    // --- START ---
    initializeDashboard();
});