import {Link} from "react-router-dom";
import React from "react";


export default function InDevelopment() {
    return (
        <main style={{padding: '32px', textAlign: 'center'}}>
            <h1 style={{fontSize: 32, fontWeight: 700, marginBottom: 12}}> Страница в разработке</h1>
            <p style={{fontSize: 16, marginBottom: 24}}>
                Данная страница находится в разработке и будет реализована позднее
            </p>
            <Link to="/">
                <button className="btn btn--outline btn--sm">
                   На главную
                </button>
            </Link>
        </main>
    )
}