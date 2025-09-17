'use client';

import Link from "next/link";
import {
  Link as LinkChakra,
  Box,
  Text,
  Icon,
} from "@chakra-ui/react";
import React from "react";
import { IconType } from "react-icons";
import { useRouter } from "next/navigation";

interface NavigationLinkItem {
  type: "link";
  label: string;
  icon: IconType;
  path: string;
}

type NavigationItem = NavigationLinkItem;

interface NavItemProps {
  item: NavigationItem;
  isActive?: boolean;
}

export const NavItem = ({ item, isActive }: NavItemProps) => {
  const router = useRouter();
  const { label, icon, path } = item;

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    if (label === "Logout") {
      // Handle logout functionality
      localStorage.removeItem("user");
      router.push("/login");
    } else {
      router.push(path);
    }
  };

  return (
    <Box w="full">
      <LinkChakra
        as={Link}
        href={path}
        onClick={handleClick}
        display="flex"
        alignItems="center"
        gap={3}
        p={3}
        borderRadius="lg"
        transition="all 0.2s"
        textDecoration="none"
        bg={isActive ? "blue.50" : "transparent"}
        color={isActive ? "blue.600" : "gray.600"}
        _hover={{
          textDecoration: "none",
          bg: isActive ? "blue.100" : "gray.50",
          color: isActive ? "blue.700" : "gray.800",
        }}
        fontWeight={isActive ? "semibold" : "medium"}
        fontSize="sm"
      >
        <Icon as={icon} boxSize={5} />
        <Text>{label}</Text>
      </LinkChakra>
    </Box>
  );
};