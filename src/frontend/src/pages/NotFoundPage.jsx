import {Link} from "react-router-dom";


export default function NotFoundPage() {
    return (
        <main style={{padding: '32px', textAlign: 'center'}}>
            <h1 style={{fontSize: 32, fontWeight: 700, marginBottom: 12}}> Страница не найдена</h1>
            <p style={{fontSize: 16, color: '#4b5563', marginBottom: 24}}>
                Проверьте корректность ссылки или вернитесь на главную страницу.
            </p>
            <Link to="/"
                  style={{
                      display: 'inline-flex',
                      padding: '12px 18px',
                      borderRadius: 12,
                      backgroundColor: '#2563eb',
                      color: '#fff',
                      textDecoration: 'none',
                      fontWeight: 600,
                  }}
            > На главную </Link>
        </main>
    )
}