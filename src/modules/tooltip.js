import '../styles/tooltip.css'; // ¡Importamos su CSS directamente!

function initCustomTooltip() {
    if (document.getElementById('custom-subtask-tooltip')) {
        return;
    }

    const tooltipElement = document.createElement('div');
    tooltipElement.id = 'custom-subtask-tooltip';
    document.body.appendChild(tooltipElement);

    // Usamos event delegation para manejar los hovers.
    document.body.addEventListener('mouseover', (e) => {
        // Solo nos interesan nuestros enlaces de subtarea
        if (e.target.matches('.subtask-title-link')) {
            const link = e.target;
            
            // --- ¡EL CAMBIO CLAVE ESTÁ AQUÍ! ---
            // Detenemos el evento INMEDIATAMENTE para que los scripts de Jira no lo reciban.
            e.stopPropagation();

            // Lógica para mostrar nuestro tooltip solo si es necesario
            if (link.scrollWidth > link.clientWidth) {
                const tooltip = document.getElementById('custom-subtask-tooltip');
                tooltip.textContent = link.dataset.fullTitle;
                tooltip.style.display = 'block';
            }
        }
    }, true); // <-- ¡IMPORTANTE! Usar 'true' para la fase de captura.

    document.body.addEventListener('mouseout', (e) => {
        if (e.target.matches('.subtask-title-link')) {
            e.stopPropagation(); // Buena práctica detener también este evento
            const tooltip = document.getElementById('custom-subtask-tooltip');
            tooltip.style.display = 'none';
        }
    }, true); // <-- También en fase de captura.
    
    document.body.addEventListener('mousemove', (e) => {
        const tooltip = document.getElementById('custom-subtask-tooltip');
        if (tooltip.style.display === 'block') {
            tooltip.style.left = (e.pageX + 10) + 'px';
            tooltip.style.top = (e.pageY + 10) + 'px';
        }
    });
}