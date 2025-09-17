import { VStack, HStack, Box, Text } from "@chakra-ui/react";
import { FiActivity } from "react-icons/fi";

const navigationItems = [
  { text: "Dashboard", icon: "🏠" },
  { text: "Posts", icon: "📝" },
  { text: "Users", icon: "👥" },
  { text: "Settings", icon: "⚙️" },
  { text: "API Health Status", icon: "activity", isReactIcon: true },
  { text: "Logout", icon: "🚪" },
];

interface NavigationItemProps {
  icon: string;
  text?: string;
  isReactIcon?: boolean;
  isActive?: boolean;
  collapse?: boolean;
  onClick?: () => void;
}

function NavigationItem({ icon, text, isReactIcon, isActive, collapse, onClick }: NavigationItemProps) {
  const renderIcon = () => {
    if (isReactIcon && icon === "activity") {
      return <FiActivity size={16} />;
    }
    return icon;
  };

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
        {renderIcon()}
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
  return (
    <VStack gap={1} align="stretch" mt={4}>
      {navigationItems.map((item, index) => (
        <NavigationItem
          key={index}
          icon={item.icon}
          text={item.text}
          isReactIcon={item.isReactIcon}
          isActive={index === 0} // Dashboard is active by default
          collapse={collapse}
        />
      ))}
    </VStack>
  );
}