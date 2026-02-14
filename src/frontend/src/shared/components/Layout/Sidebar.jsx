import React, {useCallback} from 'react';
import {NavLink} from 'react-router-dom';
import {useUser} from '@shared/auth/UserProvider.jsx';
import './Sidebar.css';
import {startKeycloakLogin} from "@shared/auth/keycloak.js";

const TEACHER_ROLES = ['teacher', 'admin', 'TEACHER', 'ADMIN'];

const TEACHER_ROLES_SET = new Set(TEACHER_ROLES.map(r => r.toLowerCase()));

function hasTeacherRole(roles) {
    return roles.some(r => TEACHER_ROLES_SET.has(String(r).toLowerCase()));
}

export default function Sidebar() {
    const {roles} = useUser();
    const isTeacher = hasTeacherRole(roles);
    const isUser = useUser();

    const handleLogin = useCallback(() => {
        startKeycloakLogin();
    }, []);

    return (
        <nav className="sidebar">
            <div className="sidebar__top">
                <NavLink to="/tests" className="sidebar__logo" title="Главная">
                    <img src="/assets/menu/lmsIcon.svg" alt="На главную"/>
                </NavLink>

                {isUser.profile ? (
                    <NavLink to="/profile" className="sidebar__link" title="Профиль">
                        <img src="/assets/menu/User.svg" alt="Профиль"/>
                    </NavLink>
                ) : (
                    <button className="sidebar__link" title="Авторизоваться" onClick={handleLogin}>
                        <img src="/assets/menu/User.svg" alt="Авторизоваться"/>
                    </button>
                )}


                {isTeacher && (
                    <NavLink to="/groups" className="sidebar__link" title="Группы">
                        <img src="/assets/menu/Group.svg" alt="Группы"/>
                    </NavLink>
                )}

                <NavLink to="/tests" className="sidebar__link" title="Тесты">
                    <img src="/assets/menu/Test.svg" alt="Тесты"/>
                </NavLink>

                {isTeacher && (
                    <NavLink to="/tests/create" className="sidebar__link" title="Создать тест">
                        <img src="/assets/menu/TestCreate.svg" alt="Создать тест"/>
                    </NavLink>
                    )}
            </div>

            <div className="sidebar__bottom">
                <NavLink to="/swagger" className="sidebar__link" title="API Console">
                    <img src="/assets/menu/Pipiska.svg" alt="API Console"/>
                </NavLink>
            </div>
        </nav>
    );
}
