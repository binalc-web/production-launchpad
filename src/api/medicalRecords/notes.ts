import axiosInstance from '../axios';
import { getErrorMessage } from '../errorMessage';
import type { NoteContent } from '@/components/FileViewer/Notes';

/**
 * Interface for data required to add a new note
 */
export interface AddNoteData {
  recordId: string;
  fileId: string;
  content: string;
}

/**
 * Fetches notes for a specific medical record and file
 * @param recordId ID of the medical record
 * @param fileId ID of the file
 * @returns Promise resolving to an array of note content
 */
export const getNotes = async (
  recordId: string,
  fileId: string
): Promise<Array<NoteContent>> => {
  try {
    const response = await axiosInstance.get(
      `/api/v1/notes?recordId=${recordId}&fileId=${fileId}`
    );
    return response.data.data as Array<NoteContent>;
  } catch (error) {
    throw getErrorMessage(error);
  }
};

/**
 * Creates a new note for a medical record file
 * @param data Object containing recordId, fileId, and content
 * @returns Promise resolving to the updated array of notes
 */
export const addNote = async (
  data: AddNoteData
): Promise<Array<NoteContent>> => {
  try {
    const response = await axiosInstance.post(`/api/v1/notes/add`, data);
    return response.data.data as Array<NoteContent>;
  } catch (error) {
    throw getErrorMessage(error);
  }
};

/**
 * Deletes a note by its ID
 * @param noteId ID of the note to delete
 * @returns Promise resolving to the updated array of notes
 */
export const deleteNote = async (
  noteId: string
): Promise<Array<NoteContent>> => {
  try {
    const response = await axiosInstance.delete(`/api/v1/notes/${noteId}`);
    return response.data.data as Array<NoteContent>;
  } catch (error) {
    throw getErrorMessage(error);
  }
};

/**
 * Updates a note's content
 * @param noteId ID of the note to edit
 * @param data Object containing the updated content
 * @returns Promise resolving to the updated array of notes
 */
export const editNote = async (
  noteId: string,
  data: { content: string }
): Promise<Array<NoteContent>> => {
  try {
    const response = await axiosInstance.patch(`/api/v1/notes/${noteId}`, data);
    return response.data.data as Array<NoteContent>;
  } catch (error) {
    throw getErrorMessage(error);
  }
};
