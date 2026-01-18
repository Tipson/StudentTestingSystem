// Хелпер, чтобы явно задавать auth-флаг и оставлять возможность переопределения.
export const withAuth = (config, auth) => {
    const safeConfig = config ?? {};
    return {
        ...safeConfig,
        auth: safeConfig.auth ?? auth,
    };
};
