/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useEffect, useState } from "react";
import {
    authRefresh,
    getMe,
    getStoredAccessToken,
    storeTokens,
    clearAccessToken,
    clearTokens,
} from "../api";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
    const [me, setMe] = useState(null);
    const [loading, setLoading] = useState(true);

    async function refreshAndLoadMe() {
        try {
            const refreshed = await authRefresh();
            await storeTokens(refreshed);

            const meData = await getMe(refreshed.access_token);
            setMe(meData);

            return true;
        } catch (error) {
            clearAccessToken();
            if (error?.status === 401) {
                clearTokens();
            }
            return false;
        }
    }

    async function bootstrap() {
        try {
            const access = getStoredAccessToken();

            if (access) {
                try {
                    const meData = await getMe(access);
                    setMe(meData);
                    return;
                } catch {
                    const isRefreshed = await refreshAndLoadMe();

                    if (!isRefreshed) {
                        clearAccessToken();
                        setMe(null);
                    }

                    return;
                }
            }

            const isRefreshed = await refreshAndLoadMe();

            if (!isRefreshed) {
                clearAccessToken();
                setMe(null);
            }
        } catch {
            clearAccessToken();
            setMe(null);
        } finally {
            setLoading(false);
        }
    }

    function logout() {
        clearTokens();
        setMe(null);
    }

    useEffect(() => {
        bootstrap();
        // bootstrap should run only once on app startup.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    return (
        <AuthContext.Provider
            value={{
                me,
                setMe,
                loading,
                isAuthorized: Boolean(me),
                logout,
            }}
        >
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    return useContext(AuthContext);
}
