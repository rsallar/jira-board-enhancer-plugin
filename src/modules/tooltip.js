import '../styles/tooltip.css'; // ¡Importamos su CSS directamente!

export function initCustomTooltip() {
    console.log("init custom tooltip");

    if (document.getElementById('custom-subtask-tooltip')) {
        return;
    }

    const tooltipElement = document.createElement('div');
    tooltipElement.id = 'custom-subtask-tooltip';
    document.body.appendChild(tooltipElement);

    const handleMouseOver = (e) => {
        const link = e.target.closest('.subtask-title-link');

        if (link) {
            // --- CASO 1: Estamos sobre un enlace de subtarea ---
            // Queremos que nuestro tooltip funcione, así que NO bloqueamos el evento aquí.
            // Simplemente ejecutamos la lógica para mostrarlo.
            if (link.scrollWidth > link.clientWidth) {
                const tooltip = document.getElementById('custom-subtask-tooltip');
                tooltip.textContent = link.dataset.fullTitle;
                tooltip.style.display = 'block';
            }

            e.stopImmediatePropagation();  

        } else if (e.target.closest('.subtask-list')) {
            // --- CASO 2: Estamos sobre la lista, pero NO sobre un enlace ---
            // (por ejemplo, en el espacio entre subtareas).
            // Aquí es donde queremos bloquear el popup de Jira.
            e.stopImmediatePropagation();
        }
        // --- CASO 3: No estamos sobre la lista en absoluto ---
        // No hacemos nada, el evento sigue su curso normal fuera de nuestra área.
    };
    
    const handleMouseOut = (e) => {
        // La lógica para ocultar el tooltip no necesita cambios.
        if (e.target.closest('.subtask-title-link')) {
            const tooltip = document.getElementById('custom-subtask-tooltip');
            tooltip.style.display = 'none';
        }
    };

    const handleMouseMove = (e) => {
        const tooltip = document.getElementById('custom-subtask-tooltip');
        if (tooltip.style.display === 'block') {
            tooltip.style.left = (e.pageX + 10) + 'px';
            tooltip.style.top = (e.pageY + 10) + 'px';
        }
    };

    // Añadimos los listeners.
    document.body.addEventListener('mouseover', handleMouseOver, true);
    document.body.addEventListener('mouseout', handleMouseOut, true);
    document.body.addEventListener('mousemove', handleMouseMove, false);
}