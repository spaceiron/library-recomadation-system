import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/common/Button';
import { Modal } from '@/components/common/Modal';
import { Input } from '@/components/common/Input';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { getReadingLists, createReadingList, getBooks, deleteReadingList } from '@/services/api';
import { ReadingList, Book } from '@/types';
import { formatDate, formatRating } from '@/utils/formatters';
import { handleApiError, showSuccess } from '@/utils/errorHandling';

/**
 * ReadingLists page component
 */
export function ReadingLists() {
  const navigate = useNavigate();
  const [lists, setLists] = useState<ReadingList[]>([]);
  const [books, setBooks] = useState<Book[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isViewDetailsModalOpen, setIsViewDetailsModalOpen] = useState(false);
  const [selectedList, setSelectedList] = useState<ReadingList | null>(null);
  const [listToDelete, setListToDelete] = useState<ReadingList | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [newListName, setNewListName] = useState('');
  const [newListDescription, setNewListDescription] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    try {
      // Load both lists and books
      const [listsData, booksData] = await Promise.all([getReadingLists(), getBooks()]);
      setLists(listsData);
      setBooks(booksData);
    } catch (error) {
      handleApiError(error);
    } finally {
      setIsLoading(false);
    }
  };

  // Helper function to get book titles for a list
  const getBookTitlesForList = (bookIds: string[]): string[] => {
    return bookIds
      .map((bookId) => books.find((book) => book.id === bookId)?.title)
      .filter((title): title is string => title !== undefined);
  };

  // Helper function to get full book objects for a list
  const getBooksForList = (bookIds: string[]): Book[] => {
    return bookIds
      .map((bookId) => books.find((book) => book.id === bookId))
      .filter((book): book is Book => book !== undefined);
  };

  const handleViewDetails = (e: React.MouseEvent, list: ReadingList) => {
    e.stopPropagation();
    setSelectedList(list);
    setIsViewDetailsModalOpen(true);
  };

  const handleBookClick = (bookId: string) => {
    navigate(`/books/${bookId}`);
  };

  const handleCreateList = async () => {
    if (!newListName.trim()) {
      alert('Please enter a list name');
      return;
    }

    try {
      const newList = await createReadingList({
        userId: '1', // TODO: Get from auth context
        name: newListName,
        description: newListDescription,
        bookIds: [],
      });
      setLists([...lists, newList]);
      setIsModalOpen(false);
      setNewListName('');
      setNewListDescription('');
      showSuccess('Reading list created successfully!');
    } catch (error) {
      handleApiError(error);
    }
  };

  const handleDeleteClick = (e: React.MouseEvent, list: ReadingList) => {
    e.stopPropagation(); // Prevent card click
    setListToDelete(list);
    setIsDeleteModalOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!listToDelete) return;

    setIsDeleting(true);
    try {
      await deleteReadingList(listToDelete.id, listToDelete.userId);
      setLists(lists.filter((list) => list.id !== listToDelete.id));
      setIsDeleteModalOpen(false);
      setListToDelete(null);
      showSuccess(`"${listToDelete.name}" deleted successfully!`);
    } catch (error) {
      handleApiError(error);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleDeleteCancel = () => {
    setIsDeleteModalOpen(false);
    setListToDelete(null);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="min-h-screen py-8 px-4">
      <div className="container mx-auto">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-4xl md:text-5xl font-bold text-slate-900 mb-2">My Reading Lists</h1>
            <p className="text-slate-600 text-lg">Organize your books into custom lists</p>
          </div>
          <Button variant="primary" size="lg" onClick={() => setIsModalOpen(true)}>
            Create New List
          </Button>
        </div>

        {lists.length === 0 ? (
          <div className="text-center py-12 bg-white/90 backdrop-blur-sm rounded-xl shadow-lg border border-slate-200">
            <svg
              className="w-16 h-16 text-slate-400 mx-auto mb-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
              />
            </svg>
            <h3 className="text-xl font-bold text-slate-900 mb-2">No reading lists yet</h3>
            <p className="text-slate-600 mb-4">
              Create your first list to start organizing your books
            </p>
            <Button variant="primary" onClick={() => setIsModalOpen(true)}>
              Create Your First List
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {lists.map((list) => {
              const bookTitles = getBookTitlesForList(list.bookIds);

              return (
                <div
                  key={list.id}
                  className="glass-effect rounded-2xl shadow-lg border border-white/20 p-6 hover:shadow-xl hover:border-violet-300 transition-all duration-300 cursor-pointer hover-glow group"
                >
                  <div className="flex items-start justify-between mb-4">
                    <h3 className="text-xl font-bold text-slate-900">{list.name}</h3>
                    <div className="flex items-center space-x-2">
                      <span className="badge-modern text-xs">
                        {list.bookIds.length} book{list.bookIds.length !== 1 ? 's' : ''}
                      </span>
                      {/* Delete Button */}
                      <button
                        onClick={(e) => handleDeleteClick(e, list)}
                        className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 p-1.5 rounded-lg hover:bg-red-100 text-red-500 hover:text-red-700"
                        title="Delete list"
                      >
                        <svg
                          className="w-4 h-4"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                          />
                        </svg>
                      </button>
                    </div>
                  </div>

                  {list.description && (
                    <p className="text-slate-600 mb-4 line-clamp-2">{list.description}</p>
                  )}

                  {/* Book Titles */}
                  <div className="mb-4">
                    {bookTitles.length > 0 ? (
                      <div className="space-y-2">
                        <h4 className="text-sm font-semibold text-slate-700 flex items-center">
                          <svg
                            className="w-4 h-4 mr-1"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 11.477 5.754 11 7.5 11s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 11.477 18.246 11 16.5 11c-1.746 0-3.332.477-4.5 1.253"
                            />
                          </svg>
                          Books in this list:
                        </h4>
                        <div className="max-h-32 overflow-y-auto">
                          <ul className="space-y-1">
                            {bookTitles.slice(0, 5).map((title, index) => (
                              <li key={index} className="text-sm text-slate-600 flex items-center">
                                <span className="w-1.5 h-1.5 bg-violet-400 rounded-full mr-2 flex-shrink-0"></span>
                                <span className="line-clamp-1">{title}</span>
                              </li>
                            ))}
                            {bookTitles.length > 5 && (
                              <li className="text-xs text-slate-500 italic pl-3.5">
                                +{bookTitles.length - 5} more book
                                {bookTitles.length - 5 !== 1 ? 's' : ''}
                              </li>
                            )}
                          </ul>
                        </div>
                      </div>
                    ) : (
                      <div className="text-center py-4">
                        <svg
                          className="w-8 h-8 text-slate-300 mx-auto mb-2"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 11.477 5.754 11 7.5 11s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 11.477 18.246 11 16.5 11c-1.746 0-3.332.477-4.5 1.253"
                          />
                        </svg>
                        <p className="text-sm text-slate-400">No books added yet</p>
                        <p className="text-xs text-slate-400">
                          Start adding books to see them here
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Footer */}
                  <div className="flex items-center justify-between text-xs text-slate-500 pt-4 border-t border-slate-200">
                    <span>Created {formatDate(list.createdAt)}</span>
                    <button
                      onClick={(e) => handleViewDetails(e, list)}
                      className="flex items-center hover:text-violet-600 transition-colors cursor-pointer"
                      disabled={list.bookIds.length === 0}
                    >
                      <svg
                        className="w-3 h-3 mr-1"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                        />
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                        />
                      </svg>
                      <span>View Details</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <Modal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          title="Create New Reading List"
        >
          <div>
            <Input
              label="List Name"
              type="text"
              value={newListName}
              onChange={(e) => setNewListName(e.target.value)}
              placeholder="e.g., Summer Reading 2024"
              required
            />

            <div className="mb-4">
              <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
              <textarea
                value={newListDescription}
                onChange={(e) => setNewListDescription(e.target.value)}
                placeholder="What's this list about?"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 min-h-[100px] resize-none"
              />
            </div>

            <div className="flex gap-3">
              <Button variant="primary" onClick={handleCreateList} className="flex-1">
                Create List
              </Button>
              <Button variant="secondary" onClick={() => setIsModalOpen(false)} className="flex-1">
                Cancel
              </Button>
            </div>
          </div>
        </Modal>

        {/* Delete Confirmation Modal */}
        <Modal isOpen={isDeleteModalOpen} onClose={handleDeleteCancel} title="Delete Reading List">
          <div className="space-y-4">
            {/* Warning Icon */}
            <div className="flex items-center justify-center w-16 h-16 mx-auto bg-red-100 rounded-full">
              <svg
                className="w-8 h-8 text-red-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z"
                />
              </svg>
            </div>

            {/* Confirmation Text */}
            <div className="text-center">
              <h3 className="text-lg font-semibold text-slate-900 mb-2">
                Are you sure you want to delete this list?
              </h3>
              <p className="text-slate-600 mb-4">
                You're about to delete <strong>"{listToDelete?.name}"</strong>
                {listToDelete && listToDelete.bookIds.length > 0 && (
                  <span>
                    {' '}
                    which contains {listToDelete.bookIds.length} book
                    {listToDelete.bookIds.length !== 1 ? 's' : ''}
                  </span>
                )}
                . This action cannot be undone.
              </p>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3">
              <Button
                variant="secondary"
                onClick={handleDeleteCancel}
                className="flex-1"
                disabled={isDeleting}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                onClick={handleDeleteConfirm}
                className="flex-1 bg-red-600 hover:bg-red-700 focus:ring-red-500"
                disabled={isDeleting}
              >
                {isDeleting ? (
                  <div className="flex items-center">
                    <LoadingSpinner size="sm" />
                    <span className="ml-2">Deleting...</span>
                  </div>
                ) : (
                  'Delete List'
                )}
              </Button>
            </div>
          </div>
        </Modal>

        {/* View Details Modal */}
        <Modal
          isOpen={isViewDetailsModalOpen}
          onClose={() => setIsViewDetailsModalOpen(false)}
          title={selectedList ? `Books in "${selectedList.name}"` : 'Book Details'}
        >
          <div className="space-y-4">
            {selectedList && (
              <>
                {selectedList.description && (
                  <p className="text-slate-600 mb-4">{selectedList.description}</p>
                )}

                {getBooksForList(selectedList.bookIds).length === 0 ? (
                  <div className="text-center py-8">
                    <svg
                      className="w-12 h-12 text-slate-300 mx-auto mb-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 11.477 5.754 11 7.5 11s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 11.477 18.246 11 16.5 11c-1.746 0-3.332.477-4.5 1.253"
                      />
                    </svg>
                    <p className="text-slate-500">No books in this list yet</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-h-96 overflow-y-auto">
                    {getBooksForList(selectedList.bookIds).map((book) => (
                      <div
                        key={book.id}
                        onClick={() => handleBookClick(book.id)}
                        className="bg-white rounded-lg border border-slate-200 p-4 hover:shadow-md hover:border-violet-300 transition-all cursor-pointer group"
                      >
                        <div className="flex space-x-3">
                          <img
                            src={book.coverImage}
                            alt={book.title}
                            className="w-16 h-20 object-cover rounded-md shadow-sm group-hover:shadow-md transition-shadow"
                            onError={(e) => {
                              e.currentTarget.src =
                                'https://via.placeholder.com/64x80?text=No+Cover';
                            }}
                          />
                          <div className="flex-1 min-w-0">
                            <h4 className="font-semibold text-slate-900 text-sm line-clamp-2 mb-1">
                              {book.title}
                            </h4>
                            <p className="text-xs text-slate-600 mb-2">by {book.author}</p>

                            <div className="flex items-center space-x-2 mb-2">
                              <div className="flex items-center">
                                <svg
                                  className="w-3 h-3 text-amber-400 mr-1"
                                  fill="currentColor"
                                  viewBox="0 0 20 20"
                                >
                                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                                </svg>
                                <span className="text-xs font-medium text-slate-700">
                                  {formatRating(book.rating)}
                                </span>
                              </div>
                              <span className="text-xs text-slate-500">•</span>
                              <span className="text-xs text-slate-500">{book.genre}</span>
                            </div>

                            <p className="text-xs text-slate-600 line-clamp-2">
                              {book.description}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                <div className="flex justify-end pt-4 border-t border-slate-200">
                  <Button variant="secondary" onClick={() => setIsViewDetailsModalOpen(false)}>
                    Close
                  </Button>
                </div>
              </>
            )}
          </div>
        </Modal>
      </div>
    </div>
  );
}
