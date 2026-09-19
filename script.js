/* =========================================================
   ASICALA'O - SCRIPT.JS
   Sistema de reservas + localStorage + SheetDB
   ========================================================= */


/* =========================================================
   CONFIGURACIÓN
   ========================================================= */

const SERVICES = {
    "Corte de Pelo": {
        duration: 30
    },

    "Barba": {
        duration: 30
    },

    "Decoloraciones": {
        duration: 90
    }
};


const BARBERS = [
    "Lucas",
    "Eze"
];


const WORKING_PERIODS = [
    {
        start: 10 * 60,
        end: 14 * 60
    },

    {
        start: 15 * 60 + 30,
        end: 22 * 60
    }
];


const STORAGE_KEY = "asicalao_reservas";


/* =========================================================
   SHEETDB
   ========================================================= */

const SHEETDB_URL =
    "https://sheetdb.io/api/v1/wz61uxvg014tp";


/* =========================================================
   RESERVAS DE SHEETDB
   ========================================================= */

let sheetReservations = [];


/* =========================================================
   ESTADO DE LA RESERVA
   ========================================================= */

const booking = {
    service: null,
    barber: null,
    date: null,
    time: null,
    clientName: "",
    clientPhone: ""
};


let currentStep = 1;


/* =========================================================
   ELEMENTOS DEL DOM
   ========================================================= */

const steps =
    document.querySelectorAll(".booking-step");

const stepIndicators =
    document.querySelectorAll(".step");

const serviceOptions =
    document.querySelectorAll(
        "[data-booking-service]"
    );

const serviceCards =
    document.querySelectorAll(
        ".service-card"
    );

const barberOptions =
    document.querySelectorAll(
        "[data-barber]"
    );

const bookingDate =
    document.getElementById(
        "bookingDate"
    );

const timeGrid =
    document.getElementById(
        "timeGrid"
    );

const scheduleStatus =
    document.getElementById(
        "scheduleStatus"
    );

const serviceError =
    document.getElementById(
        "serviceError"
    );

const barberError =
    document.getElementById(
        "barberError"
    );

const dateError =
    document.getElementById(
        "dateError"
    );

const clientName =
    document.getElementById(
        "clientName"
    );

const clientPhone =
    document.getElementById(
        "clientPhone"
    );

const nameError =
    document.getElementById(
        "nameError"
    );

const phoneError =
    document.getElementById(
        "phoneError"
    );

const continueData =
    document.getElementById(
        "continueData"
    );

const confirmBooking =
    document.getElementById(
        "confirmBooking"
    );

const confirmationModal =
    document.getElementById(
        "confirmationModal"
    );

const closeModal =
    document.getElementById(
        "closeModal"
    );

const finishBooking =
    document.getElementById(
        "finishBooking"
    );

const menuToggle =
    document.getElementById(
        "menuToggle"
    );

const nav =
    document.getElementById(
        "nav"
    );


/* =========================================================
   INICIO
   ========================================================= */

document.addEventListener(
    "DOMContentLoaded",
    () => {

        setMinimumDate();

        setupEventListeners();

        updateStepIndicators();

    }
);


/* =========================================================
   EVENT LISTENERS
   ========================================================= */

function setupEventListeners() {


    /* -----------------------------------------
       Servicios de la sección principal
    ----------------------------------------- */

    serviceCards.forEach(card => {

        const button =
            card.querySelector(
                ".service-select"
            );

        button.addEventListener(
            "click",
            () => {

                const service =
                    card.dataset.service;

                selectService(service);

                document
                    .getElementById("reserva")
                    .scrollIntoView({
                        behavior: "smooth"
                    });

                setTimeout(() => {

                    showStep(1);

                }, 300);

            }
        );

    });


    /* -----------------------------------------
       Servicios dentro del sistema
    ----------------------------------------- */

    serviceOptions.forEach(option => {

        option.addEventListener(
            "click",
            () => {

                const service =
                    option.dataset
                        .bookingService;

                selectService(service);

            }
        );

    });


    /* -----------------------------------------
       Barberos
    ----------------------------------------- */

    barberOptions.forEach(option => {

        option.addEventListener(
            "click",
            () => {

                selectBarber(
                    option.dataset.barber
                );

            }
        );

    });


    /* -----------------------------------------
       Fecha
    ----------------------------------------- */

    bookingDate.addEventListener(
        "change",
        async () => {

            if (!bookingDate.value) {
                return;
            }


            const selectedDate =
                new Date(
                    bookingDate.value +
                    "T00:00:00"
                );


            const day =
                selectedDate.getDay();


            if (day === 0) {

                bookingDate.value = "";

                booking.date = null;

                booking.time = null;


                timeGrid.innerHTML = `
                    <p class="empty-message">
                        La barbería permanece cerrada los domingos.
                        Seleccioná otro día.
                    </p>
                `;


                scheduleStatus.textContent =
                    "";

                return;

            }


            booking.date =
                bookingDate.value;

            booking.time = null;

            await generateAvailableTimes();

        }
    );


    /* -----------------------------------------
       Botones siguiente
    ----------------------------------------- */

    document
        .querySelectorAll(".next-btn")
        .forEach(button => {

            button.addEventListener(
                "click",
                () => {

                    const nextStep =
                        Number(
                            button.dataset.next
                        );

                    if (
                        validateCurrentStep()
                    ) {

                        showStep(nextStep);

                    }

                }
            );

        });


    /* -----------------------------------------
       Botones volver
    ----------------------------------------- */

    document
        .querySelectorAll(".prev-btn")
        .forEach(button => {

            button.addEventListener(
                "click",
                () => {

                    const previousStep =
                        Number(
                            button.dataset.prev
                        );

                    showStep(previousStep);

                }
            );

        });


    /* -----------------------------------------
       Datos del cliente
    ----------------------------------------- */

    continueData.addEventListener(
        "click",
        () => {

            if (
                validateClientData()
            ) {

                booking.clientName =
                    clientName.value.trim();

                booking.clientPhone =
                    clientPhone.value.trim();

                updateSummary();

                showStep(5);

            }

        }
    );


    /* -----------------------------------------
       Confirmar
    ----------------------------------------- */

    confirmBooking.addEventListener(
        "click",
        confirmReservation
    );


    /* -----------------------------------------
       Modal
    ----------------------------------------- */

    closeModal.addEventListener(
        "click",
        closeConfirmationModal
    );


    finishBooking.addEventListener(
        "click",
        finishReservation
    );


    document
        .querySelector(".modal-overlay")
        .addEventListener(
            "click",
            closeConfirmationModal
        );


    /* -----------------------------------------
       Menú móvil
    ----------------------------------------- */

    menuToggle.addEventListener(
        "click",
        toggleMobileMenu
    );


    document
        .querySelectorAll(".nav a")
        .forEach(link => {

            link.addEventListener(
                "click",
                () => {

                    nav.classList.remove(
                        "active"
                    );

                }
            );

        });


    /* -----------------------------------------
       Scroll suave
    ----------------------------------------- */

    document
        .querySelectorAll(
            'a[href^="#"]'
        )
        .forEach(link => {

            link.addEventListener(
                "click",
                event => {

                    const targetId =
                        link.getAttribute(
                            "href"
                        );

                    if (
                        targetId === "#"
                    ) {
                        return;
                    }


                    const target =
                        document.querySelector(
                            targetId
                        );


                    if (!target) {
                        return;
                    }


                    event.preventDefault();


                    target.scrollIntoView({
                        behavior: "smooth"
                    });

                }
            );

        });

}


/* =========================================================
   SELECCIONAR SERVICIO
   ========================================================= */

function selectService(service) {

    if (!SERVICES[service]) {
        return;
    }


    booking.service =
        service;

    booking.time = null;


    serviceError.textContent =
        "";


    serviceOptions.forEach(
        option => {

            option.classList.toggle(
                "selected",
                option.dataset
                    .bookingService ===
                    service
            );

        }
    );


    serviceCards.forEach(
        card => {

            card.classList.toggle(
                "selected",
                card.dataset.service ===
                    service
            );

        }
    );


    if (booking.date) {

        generateAvailableTimes();

    }

}


/* =========================================================
   SELECCIONAR BARBERO
   ========================================================= */

function selectBarber(barber) {

    if (!BARBERS.includes(barber)) {
        return;
    }


    booking.barber =
        barber;

    booking.time = null;


    barberError.textContent =
        "";


    barberOptions.forEach(
        option => {

            option.classList.toggle(
                "selected",
                option.dataset.barber ===
                    barber
            );

        }
    );


    if (booking.date) {

        generateAvailableTimes();

    }

}


/* =========================================================
   MOSTRAR PASO
   ========================================================= */

function showStep(stepNumber) {

    if (
        stepNumber < 1 ||
        stepNumber > 5
    ) {
        return;
    }


    currentStep =
        stepNumber;


    steps.forEach(step => {

        step.classList.remove(
            "active"
        );

    });


    const selectedStep =
        document.getElementById(
            `step${stepNumber}`
        );


    if (selectedStep) {

        selectedStep.classList.add(
            "active"
        );

    }


    updateStepIndicators();


    if (stepNumber === 3) {

        generateAvailableTimes();

    }


    document
        .getElementById("reserva")
        .scrollIntoView({
            behavior: "smooth",
            block: "start"
        });

}


/* =========================================================
   INDICADORES
   ========================================================= */

function updateStepIndicators() {

    stepIndicators.forEach(
        (indicator, index) => {

            const stepNumber =
                index + 1;


            indicator.classList.remove(
                "active"
            );

            indicator.classList.remove(
                "completed"
            );


            if (
                stepNumber ===
                currentStep
            ) {

                indicator.classList.add(
                    "active"
                );

            } else if (
                stepNumber <
                currentStep
            ) {

                indicator.classList.add(
                    "completed"
                );

            }

        }
    );

}


/* =========================================================
   VALIDAR PASO
   ========================================================= */

function validateCurrentStep() {

    if (currentStep === 1) {

        if (!booking.service) {

            serviceError.textContent =
                "Seleccioná un servicio para continuar.";

            return false;

        }


        serviceError.textContent =
            "";

        return true;

    }


    if (currentStep === 2) {

        if (!booking.barber) {

            barberError.textContent =
                "Seleccioná un barbero para continuar.";

            return false;

        }


        barberError.textContent =
            "";

        return true;

    }


    if (currentStep === 3) {

        if (!booking.date) {

            dateError.textContent =
                "Seleccioná una fecha.";

            return false;

        }


        if (booking.time === null) {

            dateError.textContent =
                "Seleccioná un horario disponible.";

            return false;

        }


        if (
            isSlotAlreadyBooked(
                booking.date,
                booking.time,
                booking.barber
            )
        ) {

            dateError.textContent =
                "Ese horario acaba de ser reservado. Elegí otro.";

            generateAvailableTimes();

            return false;

        }


        dateError.textContent =
            "";

        return true;

    }


    return true;

}


/* =========================================================
   FECHA MÍNIMA
   ========================================================= */

function setMinimumDate() {

    const today =
        getLocalDateString();

    bookingDate.min =
        today;

}


/* =========================================================
   FECHA LOCAL
   ========================================================= */

function getLocalDateString(
    date = new Date()
) {

    const year =
        date.getFullYear();


    const month =
        String(
            date.getMonth() + 1
        ).padStart(2, "0");


    const day =
        String(
            date.getDate()
        ).padStart(2, "0");


    return (
        `${year}-${month}-${day}`
    );

}


/* =========================================================
   FORMATEAR FECHA
   ========================================================= */

function formatDate(dateString) {

    if (!dateString) {
        return "-";
    }


    const [
        year,
        month,
        day
    ] =
        dateString.split("-");


    return (
        `${day}/${month}/${year}`
    );

}


/* =========================================================
   OBTENER RESERVAS DE SHEETDB
   ========================================================= */

async function loadSheetReservations() {

    try {

        scheduleStatus.textContent =
            "Consultando disponibilidad...";


        const response =
            await fetch(
                SHEETDB_URL,
                {
                    method: "GET",
                    cache: "no-store"
                }
            );


        if (!response.ok) {

            throw new Error(
                "Error HTTP " +
                response.status
            );

        }


        const data =
            await response.json();


        if (Array.isArray(data)) {

            sheetReservations =
                data;

        } else {

            sheetReservations =
                [];

        }


        console.log(
            "Reservas cargadas desde SheetDB:",
            sheetReservations
        );


        return sheetReservations;

    } catch (error) {

        console.error(
            "Error consultando SheetDB:",
            error
        );


        /*
         * Si SheetDB falla, usamos las reservas
         * guardadas localmente.
         */

        sheetReservations =
            getReservations();


        return sheetReservations;

    }

}


/* =========================================================
   GENERAR HORARIOS DISPONIBLES
   ========================================================= */

async function generateAvailableTimes() {

    timeGrid.innerHTML = "";

    booking.time = null;


    if (!booking.date) {

        timeGrid.innerHTML = `
            <p class="empty-message">
                Seleccioná una fecha para ver los horarios.
            </p>
        `;

        scheduleStatus.textContent =
            "";

        return;

    }


    if (!booking.service) {

        timeGrid.innerHTML = `
            <p class="empty-message">
                Primero seleccioná un servicio.
            </p>
        `;

        scheduleStatus.textContent =
            "";

        return;

    }


    if (!booking.barber) {

        timeGrid.innerHTML = `
            <p class="empty-message">
                Primero seleccioná un barbero.
            </p>
        `;

        scheduleStatus.textContent =
            "";

        return;

    }


    /*
     * Actualizamos las reservas desde SheetDB
     * antes de generar los horarios.
     */

    await loadSheetReservations();


    const duration =
        SERVICES[
            booking.service
        ].duration;


    const slots =
        generateSlotsForDate(
            booking.date,
            duration
        );


    if (slots.length === 0) {

        timeGrid.innerHTML = `
            <p class="empty-message">
                No hay horarios disponibles para esta fecha.
            </p>
        `;

        scheduleStatus.textContent =
            "";

        return;

    }


    let availableCount = 0;


    slots.forEach(slot => {

        const button =
            document.createElement(
                "button"
            );


        button.type =
            "button";


        button.className =
            "time-slot";


        button.textContent =
            formatMinutes(
                slot.start
            );


        const isBooked =
            isSlotAlreadyBooked(
                booking.date,
                slot.start,
                booking.barber
            );


        const isPast =
            isSlotInThePast(
                booking.date,
                slot.start
            );


        if (
            isBooked ||
            isPast
        ) {

            button.disabled =
                true;

        } else {

            availableCount++;


            button.addEventListener(
                "click",
                () => {

                    selectTime(
                        slot.start
                    );

                }
            );

        }


        timeGrid.appendChild(
            button
        );

    });


    if (
        availableCount === 0
    ) {

        scheduleStatus.textContent =
            "Sin horarios disponibles";

    } else {

        scheduleStatus.textContent =
            `${availableCount} horarios disponibles`;

    }

}


/* =========================================================
   GENERAR SLOTS
   ========================================================= */

function generateSlotsForDate(
    dateString,
    duration
) {

    const slots = [];


    WORKING_PERIODS.forEach(
        period => {

            for (
                let start =
                    period.start;

                start + duration <=
                    period.end;

                start += duration
            ) {

                slots.push({

                    start:
                        start,

                    end:
                        start + duration

                });

            }

        }
    );


    return slots;

}


/* =========================================================
   FORMATEAR MINUTOS
   ========================================================= */

function formatMinutes(
    minutes
) {

    const hours =
        Math.floor(
            minutes / 60
        );


    const mins =
        minutes % 60;


    return (
        String(hours)
            .padStart(2, "0") +
        ":" +
        String(mins)
            .padStart(2, "0")
    );

}


/* =========================================================
   CONVERTIR HORA A MINUTOS
   ========================================================= */

function timeToMinutes(time) {

    if (
        typeof time ===
        "number"
    ) {

        return time;

    }


    if (
        !time ||
        typeof time !==
        "string"
    ) {

        return NaN;

    }


    const parts =
        time.split(":");


    if (
        parts.length !== 2
    ) {

        return NaN;

    }


    const hours =
        Number(parts[0]);


    const minutes =
        Number(parts[1]);


    if (
        Number.isNaN(hours) ||
        Number.isNaN(minutes)
    ) {

        return NaN;

    }


    return (
        hours * 60 +
        minutes
    );

}


/* =========================================================
   SELECCIONAR HORARIO
   ========================================================= */

function selectTime(time) {

    booking.time =
        time;


    dateError.textContent =
        "";


    document
        .querySelectorAll(
            ".time-slot"
        )
        .forEach(button => {

            button.classList.remove(
                "selected"
            );


            if (
                button.textContent ===
                formatMinutes(time)
            ) {

                button.classList.add(
                    "selected"
                );

            }

        });

}


/* =========================================================
   VERIFICAR HORARIO RESERVADO
   ========================================================= */

function isSlotAlreadyBooked(
    date,
    startTime,
    barber
) {

    /*
     * Combinamos las reservas de SheetDB
     * con las reservas locales.
     */

    const localReservations =
        getReservations();


    const allReservations = [
        ...sheetReservations,
        ...localReservations
    ];


    const newDuration =
        booking.service
            ? SERVICES[
                booking.service
            ].duration
            : 0;


    const newStart =
        startTime;


    const newEnd =
        newStart +
        newDuration;


    return allReservations.some(
        reservation => {

            /*
             * SheetDB usa:
             * fecha
             * hora
             * servicio
             * barbero
             *
             * localStorage usa:
             * date
             * time
             * service
             * barber
             */

            const reservationDate =
                reservation.date ||
                reservation.fecha;


            const reservationBarber =
                reservation.barber ||
                reservation.barbero;


            const reservationTime =
                reservation.time ??
                reservation.hora;


            const reservationService =
                reservation.service ||
                reservation.servicio;


            if (
                reservationDate !==
                date
            ) {

                return false;

            }


            if (
                reservationBarber !==
                barber
            ) {

                return false;

            }


            const existingStart =
                timeToMinutes(
                    reservationTime
                );


            if (
                Number.isNaN(
                    existingStart
                )
            ) {

                return false;

            }


            const serviceInfo =
                SERVICES[
                    reservationService
                ];


            if (!serviceInfo) {

                return false;

            }


            const existingDuration =
                serviceInfo.duration;


            const existingEnd =
                existingStart +
                existingDuration;


            /*
             * Detectar superposición:
             *
             * inicio nuevo < fin existente
             * Y
             * fin nuevo > inicio existente
             */

            return (
                newStart <
                    existingEnd &&
                newEnd >
                    existingStart
            );

        }
    );

}


/* =========================================================
   VERIFICAR HORARIO PASADO
   ========================================================= */

function isSlotInThePast(
    dateString,
    startMinutes
) {

    const today =
        getLocalDateString();


    if (
        dateString !==
        today
    ) {

        return false;

    }


    const now =
        new Date();


    const currentMinutes =
        now.getHours() * 60 +
        now.getMinutes();


    return (
        startMinutes <=
        currentMinutes
    );

}


/* =========================================================
   OBTENER RESERVAS LOCALES
   ========================================================= */

function getReservations() {

    try {

        const saved =
            localStorage.getItem(
                STORAGE_KEY
            );


        if (!saved) {

            return [];

        }


        const reservations =
            JSON.parse(
                saved
            );


        return Array.isArray(
            reservations
        )
            ? reservations
            : [];

    } catch (error) {

        console.error(
            "Error leyendo reservas:",
            error
        );


        return [];

    }

}


/* =========================================================
   GUARDAR RESERVA LOCAL
   ========================================================= */

function saveReservation(
    reservation
) {

    const reservations =
        getReservations();


    reservations.push(
        reservation
    );


    localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify(
            reservations
        )
    );

}


/* =========================================================
   VALIDAR DATOS CLIENTE
   ========================================================= */

function validateClientData() {

    let valid =
        true;


    const name =
        clientName.value.trim();


    const phone =
        clientPhone.value.trim();


    nameError.textContent =
        "";


    phoneError.textContent =
        "";


    if (
        name.length < 3
    ) {

        nameError.textContent =
            "Ingresá tu nombre completo.";

        valid =
            false;

    }


    const phoneNumbers =
        phone.replace(
            /\D/g,
            ""
        );


    if (
        phoneNumbers.length < 7
    ) {

        phoneError.textContent =
            "Ingresá un número de teléfono válido.";

        valid =
            false;

    }


    return valid;

}


/* =========================================================
   ACTUALIZAR RESUMEN
   ========================================================= */

function updateSummary() {

    document.getElementById(
        "summaryService"
    ).textContent =
        booking.service;


    document.getElementById(
        "summaryBarber"
    ).textContent =
        booking.barber;


    document.getElementById(
        "summaryDate"
    ).textContent =
        formatDate(
            booking.date
        );


    document.getElementById(
        "summaryTime"
    ).textContent =
        formatMinutes(
            booking.time
        );


    document.getElementById(
        "summaryName"
    ).textContent =
        booking.clientName;


    document.getElementById(
        "summaryPhone"
    ).textContent =
        booking.clientPhone;

}


/* =========================================================
   CONFIRMAR RESERVA
   ========================================================= */

async function confirmReservation() {

    /* -----------------------------------------
       Validación final
    ----------------------------------------- */

    if (
        !booking.service ||
        !booking.barber ||
        !booking.date ||
        booking.time === null
    ) {

        alert(
            "Faltan datos de la reserva."
        );

        return;

    }


    if (
        !validateClientData()
    ) {

        showStep(4);

        return;

    }


    /*
     * Actualizar reservas desde SheetDB
     * justo antes de confirmar.
     */

    await loadSheetReservations();


    /*
     * Comprobar nuevamente si el horario
     * ya fue reservado.
     */

    if (
        isSlotAlreadyBooked(
            booking.date,
            booking.time,
            booking.barber
        )
    ) {

        alert(
            "Este horario ya no está disponible. Elegí otro."
        );


        showStep(3);


        return;

    }


    const reservation = {

        id:
            generateReservationId(),

        service:
            booking.service,

        barber:
            booking.barber,

        date:
            booking.date,

        time:
            booking.time,

        clientName:
            booking.clientName,

        clientPhone:
            booking.clientPhone,

        createdAt:
            new Date().toISOString()

    };


    /* -----------------------------------------
       GUARDAR EN SHEETDB
    ----------------------------------------- */

    confirmBooking.disabled =
        true;


    const originalText =
        confirmBooking.textContent;


    confirmBooking.textContent =
        "Guardando...";


    try {

        const response =
            await fetch(
                SHEETDB_URL,
                {

                    method:
                        "POST",

                    headers: {
                        "Content-Type":
                            "application/json"
                    },

                    body:
                        JSON.stringify({

                            data: [

                                {

                                    fecha:
                                        reservation.date,

                                    hora:
                                        formatMinutes(
                                            reservation.time
                                        ),

                                    servicio:
                                        reservation.service,

                                    barbero:
                                        reservation.barber,

                                    cliente:
                                        reservation.clientName,

                                    telefono:
                                        reservation.clientPhone

                                }

                            ]

                        })

                }
            );


        const responseText =
            await response.text();


        console.log(
            "SheetDB:",
            response.status,
            responseText
        );


        if (
            !response.ok
        ) {

            throw new Error(
                "SheetDB respondió: " +
                responseText
            );

        }


        /*
         * SheetDB confirmó.
         * Guardamos también localmente.
         */

        saveReservation(
            reservation
        );


        /*
         * Actualizamos la memoria
         * local de SheetDB.
         */

        sheetReservations.push({

            fecha:
                reservation.date,

            hora:
                formatMinutes(
                    reservation.time
                ),

            servicio:
                reservation.service,

            barbero:
                reservation.barber,

            cliente:
                reservation.clientName,

            telefono:
                reservation.clientPhone

        });


        showConfirmation(
            reservation
        );


    } catch (error) {

        console.error(
            "Error al guardar en SheetDB:",
            error
        );


        alert(
            "No se pudo guardar el turno.\n\n" +
            "El turno NO fue confirmado. " +
            "Intentá nuevamente."
        );


    } finally {

        confirmBooking.disabled =
            false;


        confirmBooking.textContent =
            originalText;

    }

}


/* =========================================================
   ID DE RESERVA
   ========================================================= */

function generateReservationId() {

    return (
        "ASI-" +
        Date.now()
            .toString(36)
            .toUpperCase()
    );

}


/* =========================================================
   MOSTRAR CONFIRMACIÓN
   ========================================================= */

function showConfirmation(
    reservation
) {

    document.getElementById(
        "confirmedService"
    ).textContent =
        reservation.service;


    document.getElementById(
        "confirmedBarber"
    ).textContent =
        reservation.barber;


    document.getElementById(
        "confirmedDate"
    ).textContent =
        formatDate(
            reservation.date
        );


    document.getElementById(
        "confirmedTime"
    ).textContent =
        formatMinutes(
            reservation.time
        );


    document.getElementById(
        "confirmedName"
    ).textContent =
        reservation.clientName;


    document.getElementById(
        "confirmedPhone"
    ).textContent =
        reservation.clientPhone;


    confirmationModal.classList.add(
        "active"
    );


    confirmationModal.setAttribute(
        "aria-hidden",
        "false"
    );


    document.body.style.overflow =
        "hidden";

}


/* =========================================================
   CERRAR MODAL
   ========================================================= */

function closeConfirmationModal() {

    confirmationModal.classList.remove(
        "active"
    );


    confirmationModal.setAttribute(
        "aria-hidden",
        "true"
    );


    document.body.style.overflow =
        "";

}


/* =========================================================
   FINALIZAR RESERVA
   ========================================================= */

function finishReservation() {

    closeConfirmationModal();


    resetBooking();


    window.scrollTo({
        top: 0,
        behavior: "smooth"
    });

}


/* =========================================================
   REINICIAR RESERVA
   ========================================================= */

function resetBooking() {

    booking.service =
        null;

    booking.barber =
        null;

    booking.date =
        null;

    booking.time =
        null;

    booking.clientName =
        "";

    booking.clientPhone =
        "";


    clientName.value =
        "";

    clientPhone.value =
        "";

    bookingDate.value =
        "";


    serviceOptions.forEach(
        option => {

            option.classList.remove(
                "selected"
            );

        }
    );


    serviceCards.forEach(
        card => {

            card.classList.remove(
                "selected"
            );

        }
    );


    barberOptions.forEach(
        option => {

            option.classList.remove(
                "selected"
            );

        }
    );


    timeGrid.innerHTML = `
        <p class="empty-message">
            Seleccioná una fecha para ver los horarios.
        </p>
    `;


    scheduleStatus.textContent =
        "";


    serviceError.textContent =
        "";

    barberError.textContent =
        "";

    dateError.textContent =
        "";

    nameError.textContent =
        "";

    phoneError.textContent =
        "";


    showStep(1);

}


/* =========================================================
   MENÚ MÓVIL
   ========================================================= */

function toggleMobileMenu() {

    nav.classList.toggle(
        "active"
    );

}


/* =========================================================
   CERRAR MODAL CON ESC
   ========================================================= */

document.addEventListener(
    "keydown",
    event => {

        if (
            event.key === "Escape" &&
            confirmationModal.classList.contains(
                "active"
            )
        ) {

            closeConfirmationModal();

        }

    }
);


/* =========================================================
   FIN DEL SCRIPT
   ========================================================= */