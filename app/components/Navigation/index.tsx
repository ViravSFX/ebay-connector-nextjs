'use client';

import { VStack, HStack, Box, Text } from "@chakra-ui/react";
import { MdOutlineSpaceDashboard, MdLogout, MdOutlinePeople, MdVpnKey, MdOutlineStore, MdBugReport } from "react-icons/md";
import { usePathname, useRouter } from "next/navigation";
import { useState, useEffect } from "react";


interface NavigationItemProps {
  icon: any;
  text?: string;
  isActive?: boolean;
  collapse?: boolean;
  onClick?: () => void;
}

function NavigationItem({ icon: Icon, text, isActive, collapse, onClick }: NavigationItemProps) {
  return (
    <HStack
      gap={3}
      p={3}
      cursor="pointer"
      _hover={{ bg: "blue.50" }}
      bg={isActive ? "blue.100" : "transparent"}
      borderRadius="md"
      w="full"
      onClick={onClick}
      justify={collapse ? "center" : "flex-start"}
    >
      <Box display="flex" alignItems="center" fontSize="16px" color={isActive ? "blue.600" : "gray.600"}>
        <Icon size={16} />
      </Box>
      {!collapse && text && (
        <Text
          fontSize="sm"
          fontWeight={isActive ? "semibold" : "medium"}
          color={isActive ? "blue.600" : "gray.700"}
        >
          {text}
        </Text>
      )}
    </HStack>
  );
}

interface NavigationProps {
  collapse?: boolean;
}

export function Navigation({ collapse }: NavigationProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);

  // Check if user is super admin
  useEffect(() => {
    const checkSuperAdmin = async () => {
      try {
        const response = await fetch('/api/debug/logs');
        if (response.status === 200) {
          setIsSuperAdmin(true);
        } else {
          setIsSuperAdmin(false);
        }
      } catch (error) {
        setIsSuperAdmin(false);
      }
    };

    checkSuperAdmin();
  }, []);

  // Get navigation items (including debug logs for super admins)
  const getNavigationItems = () => {
    const baseItems = [
      { text: "Dashboard", icon: MdOutlineSpaceDashboard, path: "/" },
      { text: "Users", icon: MdOutlinePeople, path: "/users" },
      { text: "API Tokens", icon: MdVpnKey, path: "/api-tokens" },
      { text: "eBay Accounts", icon: MdOutlineStore, path: "/ebay-connections" },
    ];

    if (isSuperAdmin) {
      baseItems.push({ text: "Debug Logs", icon: MdBugReport, path: "/debug-logs" });
    }

    baseItems.push({ text: "Logout", icon: MdLogout, path: "/login" });
    return baseItems;
  };

  const handleItemClick = (item: any) => {
    if (item.text === "Logout") {
      // Handle logout functionality
      localStorage.removeItem("user");
      router.push("/login");
    } else {
      router.push(item.path);
    }
  };

  const isItemActive = (item: any) => {
    // For Dashboard, check if we're on homepage
    if (item.text === "Dashboard") {
      return pathname === "/" || pathname === "/dashboard";
    }
    // For Users, check if we're on users page
    if (item.text === "Users") {
      return pathname === "/users";
    }
    // For API Tokens, check if we're on api-tokens page
    if (item.text === "API Tokens") {
      return pathname === "/api-tokens";
    }
    // For eBay Accounts, check if we're on ebay-connections page
    if (item.text === "eBay Accounts") {
      return pathname === "/ebay-connections";
    }
    // For Debug Logs, check if we're on debug-logs page
    if (item.text === "Debug Logs") {
      return pathname === "/debug-logs";
    }
    // For Logout, never mark as active
    if (item.text === "Logout") {
      return false;
    }
    // Default path matching
    return pathname === item.path;
  };

  const navItems = getNavigationItems();

  return (
    <VStack gap={1} align="stretch" mt={4}>
      {navItems.map((item, index) => (
        <NavigationItem
          key={index}
          icon={item.icon}
          text={item.text}
          isActive={isItemActive(item)}
          collapse={collapse}
          onClick={() => handleItemClick(item)}
        />
      ))}
    </VStack>
  );
}