'use client';

import React from 'react';
import {
  Card,
  Box,
  Text,
  Badge,
  HStack,
  VStack,
  GridItem,
} from '@chakra-ui/react';

interface InfoCardProps {
  title: string;
  description: string;
  icon?: string;
  iconColor?: string;
  iconBgColor?: string;
  badgeText?: string;
  badgeColorPalette?: string;
  onClick?: () => void;
  children?: React.ReactNode;
  variant?: 'blue' | 'green' | 'purple' | 'orange' | 'red' | 'teal';
}

const InfoCard: React.FC<InfoCardProps> = ({
  title,
  description,
  icon,
  iconColor,
  iconBgColor,
  badgeText,
  badgeColorPalette,
  onClick,
  children,
  variant = 'blue',
}) => {
  // Color scheme based on variant
  const colorSchemes = {
    blue: {
      iconColor: iconColor || 'blue.600',
      iconBgColor: iconBgColor || 'blue.50',
      borderColor: 'blue.200',
      badgeColor: badgeColorPalette || 'blue',
    },
    green: {
      iconColor: iconColor || 'green.600',
      iconBgColor: iconBgColor || 'green.50',
      borderColor: 'green.200',
      badgeColor: badgeColorPalette || 'green',
    },
    purple: {
      iconColor: iconColor || 'purple.600',
      iconBgColor: iconBgColor || 'purple.50',
      borderColor: 'purple.200',
      badgeColor: badgeColorPalette || 'purple',
    },
    orange: {
      iconColor: iconColor || 'orange.600',
      iconBgColor: iconBgColor || 'orange.50',
      borderColor: 'orange.200',
      badgeColor: badgeColorPalette || 'orange',
    },
    red: {
      iconColor: iconColor || 'red.600',
      iconBgColor: iconBgColor || 'red.50',
      borderColor: 'red.200',
      badgeColor: badgeColorPalette || 'red',
    },
    teal: {
      iconColor: iconColor || 'teal.600',
      iconBgColor: iconBgColor || 'teal.50',
      borderColor: 'teal.200',
      badgeColor: badgeColorPalette || 'teal',
    },
  };

  const colors = colorSchemes[variant];

  return (
    <GridItem>
      <Card.Root
        cursor={onClick ? 'pointer' : 'default'}
        transition="all 0.3s"
        _hover={onClick ? { transform: 'translateY(-4px)', boxShadow: 'xl' } : {}}
        onClick={onClick}
        borderRadius="xl"
        overflow="hidden"
        border="1px solid"
        borderColor={colors.borderColor}
        bg="white"
        boxShadow="md"
      >
        <Card.Body p={6}>
          <VStack align="stretch" gap={4}>
            <HStack gap={3}>
              {icon && (
                <Box
                  p={3}
                  rounded="lg"
                  bg={colors.iconBgColor}
                  color={colors.iconColor}
                  display="flex"
                  alignItems="center"
                  justifyContent="center"
                  minW={12}
                  h={12}
                >
                  <Text fontSize="xl">{icon}</Text>
                </Box>
              )}
              <VStack gap={1} align="start" flex={1}>
                <Text fontWeight="semibold" color="gray.900" fontSize="lg">
                  {title}
                </Text>
                <Text fontSize="sm" color="gray.600" lineHeight="1.4">
                  {description}
                </Text>
                {badgeText && (
                  <Badge colorPalette={colors.badgeColor} size="sm" mt={1}>
                    {badgeText}
                  </Badge>
                )}
              </VStack>
            </HStack>
            {children}
          </VStack>
        </Card.Body>
      </Card.Root>
    </GridItem>
  );
};

export default InfoCard;