const fs = require('fs');
const jsonPath = 'c:\\Users\\JhonathanChaves\\Desktop\\Jhonathan Chaves\\AZ-900\\Preguntas\\preguntasGCPACE.json';

const finalPassRules = [
    { en: /You want to/gi, es: "Usted desea" },
    { en: /You need to/gi, es: "Usted necesita" },
    { en: /You are managing/gi, es: "Usted está gestionando" },
    { en: /Your company is/gi, es: "Su empresa está" },
    { en: /What should you do\?/gi, es: "¿Qué debería hacer?" },
    { en: /Which of the following/gi, es: "¿Cuál de los siguientes" },
    { en: /best practice/gi, es: "mejor práctica" },
    { en: /least privilege/gi, es: "mínimo privilegio" },
    { en: /managed instance group/gi, es: "grupo de instancias gestionado" },
    { en: /instance template/gi, es: "plantilla de instancia" },
    { en: /service account/gi, es: "cuenta de servicio" },
    { en: /billing account/gi, es: "cuenta de facturación" },
    { en: /persistent disk/gi, es: "disco persistente" },
    { en: /boot disk/gi, es: "disco de arranque" },
    { en: /high availability/gi, es: "alta disponibilidad" },
    { en: /cost-effective/gi, es: "rentable" },
    { en: /without downtime/gi, es: "sin tiempo de inactividad" },
    { en: /CPU utilization/gi, es: "utilización de CPU" },
    { en: /Cloud Monitoring/gi, es: "Cloud Monitoring" },
    { en: /Cloud Storage/gi, es: "Cloud Storage" },
    { en: /Compute Engine/gi, es: "Compute Engine" },
    { en: /BigQuery/gi, es: "BigQuery" },
    { en: /Google Kubernetes Engine/gi, es: "Google Kubernetes Engine" },
    { en: /Artifact Registry/gi, es: "Artifact Registry" },
    { en: /Container Registry/gi, es: "Container Registry" },
    { en: /instance creation/gi, es: "creación de instancias" },
    { en: /failed to create/gi, es: "falló al crear" },
    { en: /valid syntax/gi, es: "sintaxis válida" },
    { en: /same name as/gi, es: "mismo nombre que" },
    { en: /Docker image/gi, es: "imagen de Docker" },
    { en: /Upload the image to/gi, es: "Subir la imagen a" },
    { en: /Create a/gi, es: "Crear un/a" },
    { en: /Deploy your/gi, es: "Desplegar su" },
    { en: /Use a/gi, es: "Usar un/a" },
    { en: /Set the/gi, es: "Establecer el/la" },
    { en: /Enable the/gi, es: "Habilitar la" },
    { en: /Verify that/gi, es: "Verificar que" },
    { en: /within 2 years/gi, es: "en 2 años" },
    { en: /Most employees/gi, es: "La mayoría de los empleados" },
    { en: /will need access/gi, es: "necesitarán acceso" },
    { en: /performance degradation/gi, es: "degradación del rendimiento" },
    { en: /unnecessary complexity/gi, es: "complejidad innecesaria" },
    { en: /security issues/gi, es: "problemas de seguridad" },
    { en: /through federation/gi, es: "a través de federación" },
    { en: /in real time/gi, es: "en tiempo real" },
    { en: /growing rapidly/gi, es: "creciendo rápidamente" },
    { en: /at any time/gi, es: "en cualquier momento" },
    { en: /without interruption/gi, es: "sin interrupciones" },
    { en: /automate operations/gi, es: "automatizar operaciones" },
    { en: /raised an alert/gi, es: "generó una alerta" },
    { en: /stating that/gi, es: "indicando que" },
    { en: /solve the/gi, es: "resolver el/la" },
    { en: /being used by/gi, es: "siendo utilizado por" },
    { en: /packaged into a/gi, es: "empaquetado en un" },
    { en: /referencing the image/gi, es: "que haga referencia a la imagen" },
    { en: /Selected Answer/gi, es: "Respuesta seleccionada" },
    { en: /is correct/gi, es: "es correcta" },
    { en: /is incorrect/gi, es: "es incorrecta" },
    { en: /because/gi, es: "porque" },
    { en: /should be/gi, es: "debería ser" },
    { en: /would be/gi, es: "sería" },
    { en: /could be/gi, es: "podría ser" },
    { en: /may be/gi, es: "puede ser" },
    { en: /can be/gi, es: "puede ser" },
    { en: /must be/gi, es: "debe ser" },
    { en: /will be/gi, es: "será" },
    { en: /does not/gi, es: "no" },
    { en: /do not/gi, es: "no" },
    { en: /is not/gi, es: "no es" },
    { en: /are not/gi, es: "no son" },
    { en: /have not/gi, es: "no tienen" },
    { en: /has not/gi, es: "no tiene" },
    { en: /by default/gi, es: "por defecto" },
    { en: /for example/gi, es: "por ejemplo" },
    { en: /such as/gi, es: "como" },
    { en: /including/gi, es: "incluyendo" },
    { en: /according to/gi, es: "según" },
    { en: /in order to/gi, es: "para" },
    { en: /so that/gi, es: "para que" },
    { en: /instead of/gi, es: "en lugar de" },
    { en: /rather than/gi, es: "en lugar de" },
    { en: /as well as/gi, es: "así como" },
    { en: /in addition to/gi, es: "además de" },
    { en: /due to/gi, es: "debido a" },
    { en: /thanks to/gi, es: "gracias a" },
    { en: /based on/gi, es: "basado en" },
    { en: /depending on/gi, es: "dependiendo de" },
    { en: /regardless of/gi, es: "independientemente de" },
    { en: /with the help of/gi, es: "con la ayuda de" },
    { en: /by using/gi, es: "usando" },
    { en: /by means of/gi, es: "por medio de" },
    { en: /by way of/gi, es: "a través de" },
    { en: /by through/gi, es: "a través de" },
    { en: /through/gi, es: "a través de" },
    { en: /via/gi, es: "vía" },
    { en: /using/gi, es: "usando" }
];

const smallRules = [
    { en: /\bwith\b/gi, es: "con" },
    { en: /\bfrom\b/gi, es: "de" },
    { en: /\bto\b/gi, es: "a" },
    { en: /\bfor\b/gi, es: "para" },
    { en: /\band\b/gi, es: "y" },
    { en: /\bor\b/gi, es: "o" },
    { en: /\bin\b/gi, es: "en" },
    { en: /\bat\b/gi, es: "en" },
    { en: /\bon\b/gi, es: "en" },
    { en: /\bits\b/gi, es: "su" },
    { en: /\btheir\b/gi, es: "su" },
    { en: /\byour\b/gi, es: "su" },
    { en: /\bany\b/gi, es: "cualquier" },
    { en: /\ball\b/gi, es: "todos los" },
    { en: /\beach\b/gi, es: "cada" },
    { en: /\bevery\b/gi, es: "cada" },
    { en: /\bthis\b/gi, es: "este" },
    { en: /\bthat\b/gi, es: "ese" },
    { en: /\bthese\b/gi, es: "estos" },
    { en: /\bthose\b/gi, es: "esos" },
    { en: /\bnew\b/gi, es: "nuevo" },
    { en: /\bold\b/gi, es: "viejo" },
    { en: /\bavailable\b/gi, es: "disponible" },
    { en: /\bexisting\b/gi, es: "existente" },
    { en: /\bcurrent\b/gi, es: "actual" }
];

function cleanerTranslate(text) {
    if (!text) return "";
    let result = text;
    
    finalPassRules.forEach(rule => {
        result = result.replace(rule.en, rule.es);
    });

    smallRules.forEach(rule => {
        result = result.replace(rule.en, rule.es);
    });

    return result.replace(/\s\s+/g, ' ').trim();
}

async function ultraPass() {
    const data = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
    console.log(`Performing ultra pass on ${data.length} questions...`);

    data.forEach(item => {
        item.question_es = cleanerTranslate(item.question_en || item.question);
        item.options_es = (item.options_en || item.options).map(o => cleanerTranslate(o));
        if (item.explanation_en) {
            item.explanation_es = `### Análisis y Discusión de la Comunidad:\n\n${cleanerTranslate(item.explanation_en.substring(0, 300))}...`;
        }
    });

    fs.writeFileSync(jsonPath, JSON.stringify(data, null, 2));
    console.log('Ultra pass completed.');
}

ultraPass();
