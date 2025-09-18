'use client';

import React, { useEffect, useState } from "react";
import { Avatar, Box } from "@chakra-ui/react";
import { Navigation } from "../Navigation";

interface User {
    id: string;
    email: string;
    name: string | null;
    role: string;
}

export default function Sidebar() {
    const [user, setUser] = useState<User | null>(null);

    useEffect(() => {
        // Check if user is logged in
        const storedUser = localStorage.getItem("user");
        if (storedUser) {
            setUser(JSON.parse(storedUser));
        }
    }, []);

    return (
        <React.Fragment>
            <Box w="full">
                <Navigation />
            </Box>
            {user && (
                <Avatar.Root size="sm" colorPalette="orange">
                    <Avatar.Fallback name={user.name || user.email} />
                </Avatar.Root>
            )}
        </React.Fragment>
    );
}
