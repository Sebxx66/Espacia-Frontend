// Datos de la institución que usa Espacia. Cada institución los define en .env.local (ver .env.example):
//   VITE_INSTITUTION_NAME   Nombre de la institución responsable de los datos
//   VITE_PRIVACY_EMAIL      Correo para consultas y reclamos sobre datos personales
//   VITE_LEGAL_CITY         Ciudad que aparece en los documentos
const env = import.meta.env;

export const LEGAL = {
  institution: (env.VITE_INSTITUTION_NAME as string | undefined)?.trim() || "",
  privacyEmail: (env.VITE_PRIVACY_EMAIL as string | undefined)?.trim() || "",
  city: (env.VITE_LEGAL_CITY as string | undefined)?.trim() || "Medellín, Colombia",
  // Cambia la versión cada vez que se modifique el texto: queda registrada en la autorización de cada usuario
  version: "1.0",
  effectiveDate: "1 de noviembre de 2026",
};

// "la Universidad X" o, si no se configuró, una descripción genérica
export const institutionName = () => LEGAL.institution || "la institución que opera esta plataforma";
