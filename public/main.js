document.addEventListener('DOMContentLoaded', () => {
    const artGrid = document.getElementById('artGrid');
    const prevPageBtn = document.getElementById('prevPage');
    const nextPageBtn = document.getElementById('nextPage');
    const paginationDiv = document.getElementById('pagination');
    const loader = document.getElementById('loader'); 
    const departmentSelect = document.getElementById('departmentSelect');
    const keywordInput = document.getElementById('keywordInput');
    const locationSelect = document.getElementById('localizacion'); // Cambiado
    const applyFiltersBtn = document.getElementById('applyFiltersBtn');
    const defaultImage = "https://www.jpeg-repair.org/img/index_sample3A.jpg";

    let currentPage = 1;
    const itemsPerPage = 20;
    let totalItems = 0;
    let objectIDs = [];

    // Ocultar la paginación al inicio
    paginationDiv.style.display = 'none';

    fetchDepartments();

    async function fetchDepartments() {
        try {
            const response = await fetch('https://collectionapi.metmuseum.org/public/collection/v1/departments');
            if (response.ok) {
                const data = await response.json();
                populateDepartmentSelect(data.departments);
            } else {
                console.warn(`Error en la carga de departamentos: ${response.statusText}`);
            }
        } catch (error) {
            console.log('Error al cargar departamentos:', error);
        }
    }

    function populateDepartmentSelect(departments) {
        departments.forEach(dept => {
            const option = document.createElement('option');
            option.value = dept.departmentId;
            option.textContent = dept.displayName;
            departmentSelect.appendChild(option);
        });
    }

    async function fetchObjectIDs() {
        loader.style.display = 'block';
        paginationDiv.style.display = 'none'; // Ocultar paginación mientras se cargan los resultados
        const department = departmentSelect.value;
        const keyword = keywordInput.value || 'flowers';            
        const location = locationSelect.value; // Cambiado

        try {   
            const response = await fetch(`/search?department=${department}&keyword=${encodeURIComponent(keyword)}&location=${encodeURIComponent(location)}`);
            if (!response.ok) {
                throw new Error(`Error HTTP! status: ${response.status}`);
            }
            const data = await response.json();

            if (data.objectIDs && data.objectIDs.length > 0) {
                objectIDs = data.objectIDs;
                totalItems = objectIDs.length;
                console.log(`Se encontraron ${totalItems} objetos con imágenes.`);
                await displayObjects();
            } else {
                console.warn('No se encontraron objetos con los filtros aplicados.');
                artGrid.innerHTML = '<p>No se encontraron resultados. Intente con otros filtros.</p>';
                paginationDiv.style.display = 'none';
            }
        } catch (error) {
            console.error('Error fetching object IDs:', error);
            artGrid.innerHTML = '<p>Ocurrió un error al buscar objetos. Por favor, intente de nuevo.</p>';
            paginationDiv.style.display = 'none';
        } finally {
            loader.style.display = 'none';
        }   
    }

    async function displayObjects() {
        loader.style.display = 'block';
        artGrid.innerHTML = '';
        const start = (currentPage - 1) * itemsPerPage;
        const end = start + itemsPerPage;
        const objectsToDisplay = objectIDs.slice(start, end);

        console.log(`Mostrando objetos del índice ${start} al ${end}.`);

        for (let objectID of objectsToDisplay) {
            try {
                const response = await fetch(`/object/${objectID}`);
                if (!response.ok) {
                    throw new Error(`Error HTTP! status: ${response.status}`);
                }
                const data = await response.json();
                if (data.primaryImage) {
                    const card = createCard(data);
                    artGrid.appendChild(card);
                }
            } catch (error) {
                console.error('Error fetching object data:', error);
            }
        }

        updatePagination();
        loader.style.display = 'none';
    }

    function createCard(data) {
        const card = document.createElement('div');
        card.className = 'card';
        
        const img = document.createElement('img');
        img.src = data.primaryImage || defaultImage;
        img.alt = data.title;
        
        const cardContent = document.createElement('div');
        cardContent.className = 'card-content';
        
        const title = document.createElement('h3');
        title.textContent = data.title;
        
        const artist = document.createElement('p');
        artist.textContent = `Artista: ${data.artistDisplayName || 'Desconocido'}`;
        
        const culture = document.createElement('p');
        culture.textContent = `Cultura: ${data.culture || 'Desconocido'}`;
        
        const dynasty = document.createElement('p');
        dynasty.textContent = `Dinastía: ${data.dynasty || 'Desconocido'}`;
    
        // Agregar la fecha del objeto
        const date = document.createElement('p');
        date.textContent = `Fecha: ${data.objectDate || 'Desconocida'}`;
        date.className = 'object-date'; // Agregar clase para estilos
        date.style.display = 'none'; // Ocultar inicialmente
            
        // Agregar elementos al cardContent
        cardContent.appendChild(title);
        cardContent.appendChild(artist);
        cardContent.appendChild(culture);
        cardContent.appendChild(dynasty);
        cardContent.appendChild(date); // Agregar la fecha al final del contenido de la tarjeta
            
        card.appendChild(img);
        card.appendChild(cardContent);    
    
        // Verifica si hay imágenes adicionales
        if (data.additionalImages && data.additionalImages.length > 0) {
            const additionalImagesButton = document.createElement('button');
            additionalImagesButton.textContent = 'Ver Imágenes Adicionales';
            additionalImagesButton.onclick = function() {
                showAdditionalImages(data);
            };
            additionalImagesButton.className = 'additional-images-button'; // Agrega clase para estilos
            cardContent.appendChild(additionalImagesButton);
        }

        // Mostrar la fecha al pasar el mouse por encima
        card.addEventListener('mouseenter', () => {
            date.style.display = 'block';
        });
        
        card.addEventListener('mouseleave', () => {
            date.style.display = 'none';
        });
    
        return card;
    }
    

    async function showAdditionalImages(data) {
        const additionalImagesContainer = document.getElementById('additional-images');
        additionalImagesContainer.innerHTML = '';

        if (data.additionalImages && data.additionalImages.length > 0) {
            for (let imgUrl of data.additionalImages) {
                const img = document.createElement('img');
                img.src = imgUrl;
                img.alt = 'Imagen Adicional';
                img.style.width = '100%';
                img.style.marginBottom = '10px';
                additionalImagesContainer.appendChild(img);
            }
        } else {
            additionalImagesContainer.innerHTML = '<p>No hay imágenes adicionales disponibles.</p>';
        }

        document.getElementById('modal').style.display = 'block';
    }

    window.closeModal = function() {
        document.getElementById('modal').style.display = 'none';
    }

    function updatePagination() {
        if (totalItems > itemsPerPage) {
            paginationDiv.style.display = 'block';
            prevPageBtn.disabled = currentPage === 1;
            nextPageBtn.disabled = (currentPage * itemsPerPage) >= totalItems;
        } else {
            paginationDiv.style.display = 'none';
        }
    }

    prevPageBtn.addEventListener('click', () => {
        if (currentPage > 1) {
            currentPage--;
            displayObjects();
        }
    });

    nextPageBtn.addEventListener('click', () => {
        if ((currentPage * itemsPerPage) < totalItems) {
            currentPage++;
            displayObjects();
        }
    });

    applyFiltersBtn.addEventListener('click', () => {
        currentPage = 1;
        fetchObjectIDs();
    });
});
