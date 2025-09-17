'use client';

import {
  Field,
  Select,
  createListCollection,
} from '@chakra-ui/react';

interface RoleSelectProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  label?: string;
  currentUserRole?: string;
  includeAllOption?: boolean;
  width?: string;
}

const allRoles = [
  { label: 'User', value: 'USER' },
  { label: 'Admin', value: 'ADMIN' },
  { label: 'Super Admin', value: 'SUPER_ADMIN' },
];

export default function RoleSelect({
  value,
  onChange,
  placeholder = "Select role...",
  label,
  currentUserRole,
  includeAllOption = false,
  width
}: RoleSelectProps) {

  // Filter roles based on current user permissions
  const getAvailableRoles = () => {
    let availableRoles = [...allRoles];

    if (currentUserRole) {
      availableRoles = allRoles.filter(role => {
        if (currentUserRole === 'SUPER_ADMIN') return true;
        if (currentUserRole === 'ADMIN' && role.value !== 'SUPER_ADMIN') return true;
        return false;
      });
    }

    if (includeAllOption) {
      availableRoles = [{ label: 'All Roles', value: 'ALL' }, ...availableRoles];
    }

    return availableRoles;
  };

  const roleCollection = createListCollection({
    items: getAvailableRoles(),
  });

  const SelectComponent = (
    <Select.Root
      collection={roleCollection}
      value={[value]}
      onValueChange={(details) => onChange(details.value[0])}
      w={width}
    >
      <Select.Trigger>
        <Select.ValueText placeholder={placeholder} />
      </Select.Trigger>
      <Select.Positioner>
        <Select.Content>
          {roleCollection.items.map((role) => (
            <Select.Item key={role.value} item={role}>
              {role.label}
            </Select.Item>
          ))}
        </Select.Content>
      </Select.Positioner>
    </Select.Root>
  );

  if (label) {
    return (
      <Field.Root>
        <Field.Label>{label}</Field.Label>
        {SelectComponent}
      </Field.Root>
    );
  }

  return SelectComponent;
}