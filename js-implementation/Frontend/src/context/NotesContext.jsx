import { createContext, useContext, useState } from "react";

const NotesContext = createContext();

const initialNotes = [
  {
    id: "1",
    title: "Project Ideas & App Features",
    content: "I've been thinking about possible features for our next app. A note-taking system should feel simple but powerful. Maybe we can add tag management, reminders, and a quick-filter sidebar layout.\n\nAlso, consider adding auto-save so users never lose their thoughts. The interface must use a premium dark mode layout with clean borders.",
    category: "Work",
    tags: ["Research", "Work"],
    isTrash: false,
    lastEdited: "5 mins ago"
  },
  {
    id: "2",
    title: "Quantum Computing Introduction Notes",
    content: "Notes from the introductory seminar on qubits and superposition for non-physicists. Dive deeper into quantum logic gates and entanglement over the weekend.",
    category: "Personal",
    tags: ["Research"],
    isTrash: false,
    lastEdited: "Oct 20"
  },
  {
    id: "3",
    title: "AI Ethics & Literature Review",
    content: "Analyzing the impact of large language models on academic integrity and future research frameworks. Need to cite the latest papers from the Q1 review list.",
    category: "Work",
    tags: ["Work"],
    isTrash: false,
    lastEdited: "3 hours ago"
  },
  {
    id: "4",
    title: "Old Quarterly Project roadmap Plan",
    content: "This was the initial roadmap for the version 1.0 architecture release. Keeping for retrospective purposes.",
    category: "Work",
    tags: ["Archive"],
    isTrash: false,
    lastEdited: "Jan 15"
  },
  {
    id: "5",
    title: "Temporary Deleted Draft Notes",
    content: "This text content will be permanently removed once the trash bucket gets purged.",
    category: "Personal",
    tags: ["Draft"],
    isTrash: true,
    lastEdited: "2 days ago"
  }
];

export function NotesProvider({ children }) {
  const [notes, setNotes] = useState(initialNotes);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeNoteId, setActiveNoteId] = useState("1");

  // Helper to get active note
  const getActiveNote = () => notes.find(n => n.id === activeNoteId) || notes[0];

  // Actions
  const addNote = () => {
    const newNote = {
      id: Date.now().toString(),
      title: "Untitled Note",
      content: "",
      category: "Personal",
      tags: [],
      isTrash: false,
      lastEdited: "Just now"
    };
    setNotes([newNote, ...notes]);
    setActiveNoteId(newNote.id);
  };

  const updateNote = (id, updatedFields) => {
    setNotes(prev => prev.map(note => note.id === id ? { ...note, ...updatedFields, lastEdited: "Just now" } : note));
  };

  const trashNote = (id) => {
    setNotes(prev => prev.map(note => note.id === id ? { ...note, isTrash: true, isFavorite: false } : note));
  };

  const restoreNote = (id) => {
    setNotes(prev => prev.map(note => note.id === id ? { ...note, isTrash: false } : note));
  };

  const deleteForever = (id) => {
    setNotes(prev => prev.filter(note => note.id !== id));
  };

  const emptyTrash = () => {
    setNotes(prev => prev.filter(note => !note.isTrash));
  };

  return (
    <NotesContext.Provider value={{
      notes,
      searchQuery,
      setSearchQuery,
      activeNoteId,
      setActiveNoteId,
      activeNote: getActiveNote(),
      addNote,
      updateNote,
      trashNote,
      restoreNote,
      deleteForever,
      emptyTrash
    }}>
      {children}
    </NotesContext.Provider>
  );
}

export const useNotes = () => useContext(NotesContext);