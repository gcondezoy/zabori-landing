// Textos legales: BORRADOR para revisión de un abogado. No publicar como definitivos sin esa revisión.
// [[texto]] marca lo que debe definir el negocio: se ve resaltado en la página.
// Al cambiar un texto, subir LEGAL_VERSION: cada pedido y cuenta guarda la versión que aceptó.
import { money, site } from '../config/site'

export const LEGAL_VERSION = '2026-10-31-borrador-2'

const data = site.legal
const pending = (value, label) => value || `[[${label}]]`
const owner = pending(data.razonSocial, 'Razón social')
const ruc = pending(data.ruc, 'RUC')
const domicile = pending(data.domicilio, 'Domicilio legal')
const contact = pending(data.email, 'Correo de atención')

export const LEGAL_PAGES = {
  terminos: {
    title: 'Términos y Condiciones',
    intro: `Estas condiciones se aplican a los pedidos que haces en la web de ${site.name}, con cuenta o como invitado.`,
    sections: [
      { title: 'Quiénes somos', blocks: [
        `${site.name} es operado por ${owner}, RUC ${ruc}, con domicilio en ${domicile}.`,
        `Para atención y consultas: ${contact} o WhatsApp ${site.whatsappLabel}.`,
      ] },
      { title: 'Qué vendemos', blocks: [
        'Menús del día con entrada, segundo y bebida incluida, platos que armas a tu gusto y otros productos publicados en la carta.',
        'La carta cambia según el día. Las fotos son referenciales y la disponibilidad puede variar.',
        'Si tienes una alergia o restricción alimentaria, avísanos antes de pedir. [[Definir qué información de alérgenos se entrega y cómo se atienden estos casos]]',
      ] },
      { title: 'Cómo se hace un pedido', blocks: [
        'Eliges tus productos, escoges delivery o recojo, completas tus datos y confirmas. Te mostramos un código para seguir tu pedido.',
        `Atendemos ${site.schedule}. [[Definir qué pasa con los pedidos hechos fuera de este horario]]`,
      ] },
      { title: 'Precios', blocks: [
        'Los precios están en soles y se muestran antes de confirmar. El total final incluye el táper elegido y, si corresponde, el delivery. [[Confirmar con el contador cómo se muestra el IGV]]',
      ] },
      { title: 'Delivery y recojo', blocks: [
        `El delivery cuesta ${money(site.deliveryFee)} y es gratis en pedidos desde ${money(site.freeDeliveryFrom)}.`,
        'Revisa que tu dirección y celular estén correctos. [[Definir zona de reparto, tiempos estimados y qué pasa si nadie recibe el pedido]]',
        `El recojo es en: ${site.address}.`,
      ] },
      { title: 'Pagos', blocks: [
        'Con Yape o Plin, pagas al número o QR que te mostramos y envías la captura por WhatsApp. Preparamos tu pedido cuando confirmamos el pago.',
        'Cuando esté disponible el pago con tarjeta, se procesa con Culqi. Escribes los datos de tu tarjeta en el formulario de Culqi y nosotros no los recibimos ni los guardamos.',
      ] },
      { title: 'Cancelaciones, cambios y reembolsos', blocks: [
        '[[Definir hasta cuándo se puede cancelar o cambiar un pedido]]',
        '[[Definir qué pasa si un pedido llega incompleto o en mal estado, en qué plazo debe avisarse y cómo y cuándo se devuelve el dinero]]',
      ] },
      { title: 'Comprobantes de pago', blocks: [
        '[[Definir con el contador cómo se solicita y se entrega la boleta o factura]]',
      ] },
      { title: 'Tu cuenta', blocks: [
        'Crear una cuenta es opcional. Cuida tu contraseña y mantén tus datos actualizados. Puedes pedir que eliminemos tu cuenta escribiéndonos.',
      ] },
      { title: 'Reclamos', blocks: [
        data.reclamosUrl
          ? 'Puedes presentar un reclamo o queja en nuestro Libro de Reclamaciones, enlazado al pie de esta página.'
          : 'Puedes presentar un reclamo o queja en nuestro Libro de Reclamaciones. [[Agregar el enlace al Libro de Reclamaciones virtual]]',
      ] },
      { title: 'Cambios y ley aplicable', blocks: [
        'Podemos actualizar estas condiciones. Cada pedido se rige por la versión aceptada al hacerlo.',
        'Se aplican las leyes del Perú. [[Confirmar con el abogado la redacción de esta cláusula]]',
      ] },
    ],
  },
  privacidad: {
    title: 'Política de Privacidad',
    intro: 'Aquí te contamos qué datos personales usamos, para qué y cómo puedes ejercer tus derechos, según la Ley N.° 29733 y su reglamento.',
    sections: [
      { title: 'Responsable de tus datos', blocks: [
        `${owner}, RUC ${ruc}, con domicilio en ${domicile}. Contacto: ${contact}.`,
        `Banco de datos de clientes: ${pending(data.bancoDatos, 'Número de inscripción en el Registro Nacional de Protección de Datos Personales')}.`,
      ] },
      { title: 'Qué datos usamos', blocks: [
        { list: [
          'Para tu pedido: nombre, celular, dirección, referencia, indicaciones y, si la marcas, tu ubicación en el mapa.',
          'Si creas una cuenta: correo, nombre, celular, dirección guardada e historial de pedidos. Tu contraseña se guarda cifrada y nosotros no podemos verla.',
          'Del pedido: productos, montos, medio de pago, estado y fechas.',
          'Si pagas con Yape o Plin: la captura que nos envías por WhatsApp.',
          'Si activas los avisos del pedido: la dirección técnica que genera tu navegador para enviarte notificaciones. La borramos cuando tu pedido termina.',
          'Si pagas con tarjeta: tu correo y la referencia del cobro. No recibimos ni guardamos el número, la fecha de vencimiento ni el código de seguridad.',
        ] },
      ] },
      { title: 'Para qué los usamos', blocks: [
        { list: [
          'Preparar, entregar y cobrar tu pedido, y avisarte cómo va, también con notificaciones si las activas.',
          'Atender tus consultas y reclamos.',
          'Administrar tu cuenta y mostrarte tus pedidos anteriores.',
          'Cumplir obligaciones legales y contables.',
          'Enviarte promociones por correo, solo si marcaste esa casilla.',
        ] },
      ] },
      { title: 'Tu consentimiento', blocks: [
        'Al marcar la casilla aceptas el uso de tus datos para atender tu pedido o crear tu cuenta. Sin esos datos no podemos procesarlo. Guardamos la fecha y la versión que aceptaste.',
        'Recibir promociones es opcional y no afecta tus pedidos. Puedes quitar ese permiso en Mi cuenta o escribiéndonos.',
      ] },
      { title: 'Con quién los compartimos', blocks: [
        'No vendemos tus datos. Solo los comparten los proveedores que necesitamos para operar:',
        { list: [
          'Supabase: base de datos y cuentas.',
          'Vercel: alojamiento de la web.',
          'Culqi: procesa los pagos con tarjeta.',
          'Resend: envío de correos, cuando esté activo.',
          'Photon y OpenStreetMap: búsqueda de direcciones y mapa, cuando escribes tu dirección o usas tu ubicación.',
          'WhatsApp: si decides escribirnos por ese medio.',
          'El servicio de notificaciones de tu navegador (por ejemplo Google o Apple): si activas los avisos del pedido.',
          '[[Indicar quién hace el reparto, si es un tercero]]',
        ] },
        'Algunos de estos proveedores tienen sus servidores fuera del Perú. [[Confirmar con el abogado cómo informar esta transferencia internacional]]',
      ] },
      { title: 'Cuánto tiempo los guardamos', blocks: [
        '[[Definir el plazo de conservación de pedidos y cuentas, según las obligaciones legales y contables]]',
      ] },
      { title: 'Tus derechos', blocks: [
        `Puedes pedir acceso, rectificación, cancelación u oposición al uso de tus datos, y retirar tu consentimiento, escribiendo a ${contact}. [[Confirmar el procedimiento y los plazos de respuesta]]`,
        'Si no estás conforme con la atención, puedes acudir a la Autoridad Nacional de Protección de Datos Personales.',
      ] },
      { title: 'Seguridad y datos en tu navegador', blocks: [
        'La web usa conexión cifrada y el acceso al panel está restringido a administradores.',
        'Tu navegador guarda tu carrito y tu sesión para que no los pierdas. No usamos herramientas de publicidad ni de medición de visitas.',
      ] },
      { title: 'Menores de edad', blocks: [
        '[[Definir con el abogado la regla para menores de edad]]',
      ] },
      { title: 'Cambios', blocks: [
        'Podemos actualizar esta política. Publicaremos aquí la versión vigente y su fecha.',
      ] },
    ],
  },
}
