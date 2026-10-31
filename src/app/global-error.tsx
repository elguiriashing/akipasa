"use client";

import styles from "./global-error.module.css";

export default function GlobalError(_props: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  void _props;
  return (
    <html lang="en">
      <head>
        <title>AkiSuite · Please try again</title>
        <meta name="robots" content="noindex, nofollow" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </head>
      <body className={styles.body}>
        <main className={styles.card}>
          <p className={styles.brand}>AkiSuite</p>
          <div lang="en">
            <h1>We couldn’t open this page</h1>
            <p>Please try again. Reloading may restore the page.</p>
          </div>
          <div lang="es" className={styles.translation}>
            <h2>No hemos podido abrir esta página</h2>
            <p>Vuelve a intentarlo. Recargar puede recuperar la página.</p>
          </div>
          {/* A normal document link requests GET, without replaying a failed action. */}
          <a className={styles.retry} href="">
            <span lang="en">Retry</span>
            <span> · </span>
            <span lang="es">Reintentar</span>
          </a>
        </main>
      </body>
    </html>
  );
}
