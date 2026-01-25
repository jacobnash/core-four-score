import { fireEvent, render, waitFor } from '@testing-library/react-native';
import React, { useState } from 'react';
import { Button, TextInput } from 'react-native';

// Create a tiny test harness component that mimics the create flow deterministically
function CreateHarness({ onCreate }: { onCreate: (name: string, memberIds: string[]) => Promise<void> }) {
  const [name, setName] = useState('');
  const [selected, setSelected] = useState<Record<string, boolean>>({ u1: true }); // pre-select current user

  const toggle = (uid: string) => setSelected(s => ({ ...s, [uid]: !s[uid] }));

  const handleCreate = async () => {
    const memberIds = Object.keys(selected).filter(k => selected[k]);
    await onCreate(name, memberIds);
  };

  return (
    <>
      <TextInput placeholder="My Weekend Tournament" value={name} onChangeText={setName} />
      <Button title="Toggle U2" onPress={() => toggle('u2')} />
      <Button title="Create" onPress={handleCreate} />
    </>
  );
}

describe('CreateHarness', () => {
  it('calls onCreate with selected users', async () => {
    const mockCreate = jest.fn(async (n: string, ids: string[]) => { });
    const { getByText, getByPlaceholderText } = render(<CreateHarness onCreate={mockCreate} /> as any);

    const nameInput = getByPlaceholderText('My Weekend Tournament');
    fireEvent.changeText(nameInput, 'Unit Tourney');

    // Toggle u2 on
    const toggle = getByText('Toggle U2');
    fireEvent.press(toggle);

    // Click create
    const create = getByText('Create');
    fireEvent.press(create);

    await waitFor(() => expect(mockCreate).toHaveBeenCalledWith('Unit Tourney', expect.arrayContaining(['u1', 'u2'])));
  });
});
