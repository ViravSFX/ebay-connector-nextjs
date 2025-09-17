import React from 'react';
import {
  Card,
  CardBody,
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
  badgeColorScheme?: string;
  onClick?: () => void;
  children?: React.ReactNode;
}

const InfoCard: React.FC<InfoCardProps> = ({
  title,
  description,
  icon,
  iconColor = 'gray.600',
  iconBgColor = 'gray.100',
  badgeText,
  badgeColorScheme = 'gray',
  onClick,
  children,
}) => {
  return (
    <GridItem>
      <Card.Root
        cursor={onClick ? 'pointer' : 'default'}
        transition="all 0.3s"
        _hover={onClick ? { transform: 'translateY(-4px)', shadow: 'xl' } : {}}
        onClick={onClick}
        borderRadius="xl"
        overflow="hidden"
        border="1px solid"
        borderColor="gray.100"
      >
        <CardBody p={6}>
          <VStack align="stretch" gap={4}>
            <HStack gap={3}>
              {icon && (
                <Box
                  p={3}
                  rounded="lg"
                  bg={iconBgColor}
                  color={iconColor}
                  display="flex"
                  alignItems="center"
                  justifyContent="center"
                >
                  <Text fontSize="xl">{icon}</Text>
                </Box>
              )}
              <VStack gap={1} align="start" flex={1}>
                <Text fontWeight="semibold" color="gray.900">
                  {title}
                </Text>
                <Text fontSize="sm" color="gray.600">
                  {description}
                </Text>
                {badgeText && (
                  <Badge colorScheme={badgeColorScheme} size="sm">
                    {badgeText}
                  </Badge>
                )}
              </VStack>
            </HStack>
            {children}
          </VStack>
        </CardBody>
      </Card.Root>
    </GridItem>
  );
};

export default InfoCard;