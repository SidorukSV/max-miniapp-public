import { createContext, useContext } from "react";

export const MaxContext = createContext(null);

export function useMax() {
    const ctx = useContext(MaxContext);
    if (!ctx){
        throw new Error("useMax must be used inside MaxProvider");
    }
    return ctx;
}