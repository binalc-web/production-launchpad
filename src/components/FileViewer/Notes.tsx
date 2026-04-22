import { useState, type FC, type MouseEvent } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';

import {
  Avatar,
  Box,
  Button,
  IconButton,
  TextField,
  Typography,
  Menu,
  MenuItem,
} from '@mui/material';
import { CalendarDotsIcon, DotsThreeVerticalIcon } from '@phosphor-icons/react';
import { GreyDot } from '@/pages/CaseManagement/components/view/PatientInfo';
import AppCustomLoader from '../AppCustomLoader';
import moment from 'moment';
import { addNote, deleteNote, editNote } from '@/api/medicalRecords/notes';
import { trackEvent } from '@/utils/mixPanel/mixpanel';

export interface NoteContent {
  _id: string;
  fileId: string;
  content: string;
  recordId: string;
  createdBy: {
    _id: string;
    firstName: string;
    lastName: string;
    avatar: string | undefined;
  };
  createdAt: string;
  updatedAt: string;
}
interface NotesProps {
  notes: Array<NoteContent>;
  meta?: {
    [key: string]: string | boolean | null | undefined;
    recordId?: string;
    fileId?: string;
  };
}

/**
 * Notes component displays and manages notes for a medical file
 * Provides functionality to add, edit, and delete notes
 */
const Notes: FC<NotesProps> = ({ notes, meta }) => {
  const [editingNoteIndex, setEditingNoteIndex] = useState<number | null>(null);
  const [editedContent, setEditedContent] = useState<string>('');
  const [newNoteContent, setNewNoteContent] = useState<string>('');
  const [menuAnchorElement, setMenuAnchorElement] =
    useState<null | HTMLElement>(null);
  const [activeNoteIndex, setActiveNoteIndex] = useState<number | null>(null);

  const queryClient = useQueryClient();

  /**
   * Opens the note actions menu for a specific note
   * @param event Mouse event from the menu button click
   * @param index Index of the note in the notes array
   */
  const handleMenuOpen = (
    event: MouseEvent<HTMLButtonElement>,
    index: number
  ): void => {
    event.stopPropagation();
    setMenuAnchorElement(event.currentTarget);
    setActiveNoteIndex(index);
  };

  /**
   * Closes the note actions menu
   */
  const handleMenuClose = (): void => {
    setMenuAnchorElement(null);
    setActiveNoteIndex(null);
  };

  /**
   * Initiates editing of a note when Edit is clicked in the menu
   * Sets the active note to edit mode and loads its content
   */
  const handleEditClick = (): void => {
    if (activeNoteIndex !== null) {
      setEditingNoteIndex(activeNoteIndex);
      setEditedContent(notes[activeNoteIndex].content);
      handleMenuClose();
    }
  };

  /**
   * Mutation for deleting a note
   * Uses the deleteNote API to remove a note and refreshes the notes list on success
   */
  const deleteNoteMutation = useMutation({
    mutationFn: deleteNote,
    onSuccess: () => {
      if (activeNoteIndex !== null) {
        void trackEvent('Note Deleted', {
          noteId: notes[activeNoteIndex]._id,
          recordId: meta?.recordId,
        });
      }
      void queryClient.invalidateQueries({
        queryKey: ['notes', meta?.recordId, meta?.fileId],
      });
      handleMenuClose();
    },
  });

  /**
   * Handles deletion of a note when Delete is clicked in the menu
   * Triggers the delete mutation if a note is selected
   */
  const handleDeleteClick = (): void => {
    if (activeNoteIndex !== null) {
      void trackEvent('Note Delete Click Button Clicked', {
        noteId: notes[activeNoteIndex]._id,
        recordId: meta?.recordId,
      });
      const noteToDelete = notes[activeNoteIndex];
      deleteNoteMutation.mutate(noteToDelete._id);
    } else {
      handleMenuClose();
    }
  };

  /**
   * Cancels the editing of a note
   * Resets the editing state and clears edited content
   */
  const handleCancelEdit = (): void => {
    void trackEvent('Note Edit Cancelled', {
      noteId: notes[editingNoteIndex || 0]?._id,
      recordId: meta?.recordId,
    });
    setEditingNoteIndex(null);
    setEditedContent('');
  };

  /**
   * Cancels the addition of a new note
   * Clears the new note content field
   */
  const handleCancelAddNote = (): void => {
    setNewNoteContent('');
  };

  /**
   * Mutation for editing a note
   * Updates an existing note's content and refreshes the notes list on success
   */
  const editNoteMutation = useMutation({
    mutationFn: ({ noteId, content }: { noteId: string; content: string }) =>
      editNote(noteId, { content }),
    onSuccess: () => {
      void trackEvent('Note Edited', {
        noteId: notes[editingNoteIndex || 0]?._id,
        recordId: meta?.recordId,
      });
      void queryClient.invalidateQueries({
        queryKey: ['notes', meta?.recordId, meta?.fileId],
      });
      setEditingNoteIndex(null);
      setEditedContent('');
    },
  });

  /**
   * Updates a note with edited content
   * Triggers the edit mutation with the note ID and new content
   */
  const handleUpdateNote = (): void => {
    if (editingNoteIndex === null || !editedContent.trim()) return;

    const noteToEdit = notes[editingNoteIndex];
    void trackEvent('Note Edit Button Clicked', {
      noteId: noteToEdit._id,
      recordId: meta?.recordId,
    });
    editNoteMutation.mutate({
      noteId: noteToEdit._id,
      content: editedContent.trim(),
    });
  };

  /**
   * Mutation for adding a new note
   * Creates a new note and refreshes the notes list on success
   */
  const addNoteMutation = useMutation({
    mutationFn: addNote,
    onSuccess: () => {
      void trackEvent('Note Added', {
        recordId: meta?.recordId,
        fileId: meta?.fileId,
      });
      void queryClient.invalidateQueries({
        queryKey: ['notes', meta?.recordId, meta?.fileId],
      });
      setNewNoteContent('');
    },
  });

  /**
   * Adds a new note
   * Triggers the add mutation with the note content and metadata
   */
  const handleAddNote = (): void => {
    if (!newNoteContent.trim() || !meta?.recordId || !meta?.fileId) return;
    void trackEvent('Note Add button Clicked', {
      recordId: meta?.recordId,
      fileId: meta?.fileId,
    });
    addNoteMutation.mutate({
      recordId: meta.recordId,
      fileId: meta.fileId,
      content: newNoteContent.trim(),
    });
  };
  return (
    <Box
      onClick={(event) => event.stopPropagation()}
      sx={{
        height: '100%',
        overflow: 'auto',
      }}
    >
      <Box
        sx={{
          p: 2,
          display: 'flex',
          border: '1px solid',
          alignItems: 'center',
          borderColor: 'divider',
          bgcolor: 'common.white',
        }}
      >
        <Typography variant="h6">Notes</Typography>
      </Box>
      {meta?.isLoading ? (
        <Box
          sx={{
            ml: 4,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            height: 'calc(100% - 56px)',
          }}
        >
          <AppCustomLoader height={200} />
        </Box>
      ) : meta?.isError ? (
        <Box
          sx={{
            ml: 2,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            height: 'calc(100% - 56px)',
          }}
        >
          <Typography variant="body2" color="error" fontWeight={600}>
            {meta.error}
          </Typography>
        </Box>
      ) : (
        <Box
          sx={{
            display: 'flex',
            flexDirection: 'column',
            height: 'calc(100% - 56px)',
            justifyContent: 'space-between',
          }}
        >
          <Box
            sx={{
              p: 2,
              overflow: 'auto',
            }}
          >
            {notes.map((note, index) => (
              <Box
                key={index}
                sx={{
                  p: 1,
                  bgcolor: 'white',
                  border: '1px solid',
                  borderRadius: '10px',
                  mt: index > 0 ? 1 : 0,
                  borderColor: '#EDEEF1',
                }}
              >
                <Box
                  sx={{
                    gap: 1,
                    display: 'flex',
                  }}
                >
                  {editingNoteIndex === index ? (
                    <TextField
                      multiline
                      rows={4}
                      fullWidth
                      value={editedContent}
                      onChange={(event) => setEditedContent(event.target.value)}
                      variant="outlined"
                      autoFocus
                    />
                  ) : (
                    <>
                      <Typography fontSize={14} sx={{ flexGrow: 1 }}>
                        {note.content}
                      </Typography>
                      <Box>
                        <IconButton
                          size="small"
                          variant="soft"
                          onClick={(event) => handleMenuOpen(event, index)}
                        >
                          <DotsThreeVerticalIcon size={18} />
                        </IconButton>
                      </Box>
                    </>
                  )}
                </Box>
                {editingNoteIndex === index && (
                  <Box
                    sx={{
                      mt: 1,
                      gap: 1,
                      display: 'flex',
                      justifyContent: 'flex-end',
                    }}
                  >
                    <Button
                      size="small"
                      color="inherit"
                      variant="outlined"
                      onClick={handleCancelEdit}
                      disabled={editNoteMutation.isPending}
                    >
                      Cancel
                    </Button>
                    <Button
                      size="small"
                      variant="contained"
                      onClick={handleUpdateNote}
                      disabled={
                        !editedContent.trim() || editNoteMutation.isPending
                      }
                    >
                      {editNoteMutation.isPending ? 'Updating...' : 'Update'}
                    </Button>
                  </Box>
                )}
                {editingNoteIndex !== index && (
                  <Box
                    sx={{
                      mt: 1,
                      display: 'flex',
                      alignItems: 'center',
                      gap: 1,
                    }}
                  >
                    <Box
                      sx={{
                        gap: 0.5,
                        display: 'flex',
                        alignItems: 'center',
                      }}
                    >
                      <Avatar
                        src={
                          note.createdBy.avatar
                            ? `${import.meta.env.VITE_AVATAR_CLOUD_FRONT_DISTRIBUTION}${note.createdBy.avatar}`
                            : undefined
                        }
                        sx={{
                          width: 16,
                          height: 16,
                          fontSize: 10,
                        }}
                      >
                        {`${note.createdBy.firstName[0].toUpperCase()}${note.createdBy.lastName[0].toUpperCase()}`}
                      </Avatar>
                      <Typography fontSize={12} color="text.secondary">
                        {note.createdBy.firstName} {note.createdBy.lastName}
                      </Typography>
                    </Box>
                    {GreyDot}
                    <Box
                      sx={{
                        gap: 0.5,
                        display: 'flex',
                        alignItems: 'center',
                      }}
                    >
                      <CalendarDotsIcon size={12} />
                      <Typography fontSize={12} color="text.secondary">
                        {moment(note.updatedAt || note.createdAt).isSame(
                          moment(),
                          'day'
                        )
                          ? 'Today'
                          : moment(note.updatedAt || note.createdAt).format(
                              'MM-DD-YYYY'
                            )}
                      </Typography>
                    </Box>
                  </Box>
                )}
              </Box>
            ))}
          </Box>
          <Box
            sx={{
              p: 2,
              bgcolor: 'common.white',
            }}
          >
            <TextField
              rows={2}
              multiline
              fullWidth
              placeholder="Write your note here..."
              value={newNoteContent}
              onChange={(event) => setNewNoteContent(event.target.value)}
              disabled={addNoteMutation.isPending}
            />
            <Box
              sx={{
                mt: 1,
                gap: 1,
                display: 'flex',
                justifyContent: 'flex-end',
              }}
            >
              <Button
                size="small"
                color="inherit"
                variant="outlined"
                onClick={handleCancelAddNote}
                disabled={addNoteMutation.isPending}
              >
                Cancel
              </Button>
              <Button
                size="small"
                variant="contained"
                onClick={handleAddNote}
                disabled={!newNoteContent.trim() || addNoteMutation.isPending}
              >
                {addNoteMutation.isPending ? 'Adding...' : 'Add'}
              </Button>
            </Box>
          </Box>
        </Box>
      )}
      <Menu
        anchorEl={menuAnchorElement}
        open={Boolean(menuAnchorElement)}
        onClose={handleMenuClose}
        anchorOrigin={{
          vertical: 'bottom',
          horizontal: 'right',
        }}
        transformOrigin={{
          vertical: 'top',
          horizontal: 'right',
        }}
      >
        <MenuItem onClick={handleEditClick}>Edit</MenuItem>
        <MenuItem
          onClick={handleDeleteClick}
          disabled={deleteNoteMutation.isPending}
        >
          {deleteNoteMutation.isPending ? 'Deleting...' : 'Delete'}
        </MenuItem>
      </Menu>
    </Box>
  );
};

export default Notes;
