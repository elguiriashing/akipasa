import Link from "next/link";
import { isLocale } from "@/lib/config";
import { notFound } from "next/navigation";
export default async function CheckInEntry({params}:{params:Promise<{locale:string}>}) {
 const {locale}=await params;
 if(!isLocale(locale)) notFound();
 const es=locale==="es";
 return <main className="shell" style={{maxWidth:720,margin:"0 auto",paddingBlock:"clamp(3rem,9vw,6rem)"}}>
   <section className="hero">
     <div className="eyebrow">AkiPasa · Check-in</div>
     <h1>{es?"Cada aventura empieza aquí.":"Your next adventure starts here."}</h1>
     <p className="lede">{es?"Escanea el código QR oficial del local con la cámara de tu móvil. Al abrir el enlace podrás verificar tu presencia antes de confirmar la visita.":"Scan the venue's official AkiPasa QR code with your phone camera. Open its link to verify your presence before confirming a visit."}</p>
   </section>
   <section className="panel" style={{display:"grid",gap:"1rem"}}>
     <h2>{es?"¿Cómo funciona?":"How it works"}</h2>
     <p>{es?"1. Visita un local participante. 2. Escanea su QR. 3. Verifica tu ubicación y confirma el check-in.":"1. Visit a participating venue. 2. Scan its QR. 3. Verify your location and confirm your check-in."}</p>
     <p className="muted">{es?"Este botón no registra ninguna visita ni otorga puntos por sí solo.":"Opening this screen does not record a visit or grant rewards."}</p>
     <Link className="button" href={`/${locale}/map`}>{es?"Explorar locales":"Explore venues"}</Link>
   </section>
 </main>;
}
