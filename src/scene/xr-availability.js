export const XR_UNAVAILABLE = 'No hay un sistema AR compatible disponible en este dispositivo o navegador. En Android, comprueba Chrome actualizado y Servicios de Google Play para RA en un equipo compatible con ARCore. También puedes continuar en 3D o con cámara de fondo.';

export function xrFailure(error) {
  if (error?.name === 'AbortError') return 'Entrada en AR cancelada. Puedes continuar explorando.';
  if (error?.name === 'NotSupportedError' || /no runtimes supported|requested configuration/i.test(error?.message || '')) return XR_UNAVAILABLE;
  if (error?.name === 'SecurityError') return 'El navegador o la página que contiene ExplorAR está bloqueando el seguimiento espacial. Abre la URL HTTPS del sitio directamente en una pestaña y revisa sus permisos.';
  if (error?.name === 'NotAllowedError') return 'No se autorizó el acceso a AR. Revisa los permisos del sitio o continúa en 3D.';
  return 'No se pudo iniciar la detección de superficies. Comprueba que el sistema AR esté disponible, cierra otras sesiones AR e inténtalo otra vez.';
}

export function spatialPolicyAllowed(document) {
  const policy = document.permissionsPolicy || document.featurePolicy;
  try {
    if (!policy?.allowsFeature || policy.features && !policy.features().includes('xr-spatial-tracking')) return true;
    return policy.allowsFeature('xr-spatial-tracking');
  } catch { return true; }
}
