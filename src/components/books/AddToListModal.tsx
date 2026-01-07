import { useState, useEffect } from 'react';
import { Modal } from '@/components/common/Modal';
import { Button } from '@/components/common/Button';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { getReadingLists, updateReadingList } from '@/services/api';
import { ReadingList, Book } from '@/types';
import { handleApiError, showSuccess } from '@/utils/errorHandling';

/**
 * AddToListModal component props
 */
interface AddToListModalProps {
  isOpen: boolean;
  onClose: () => void;
  book: Book;
}

/**
 * Modal for adding a book to a reading list
 *
 * @example
 * <AddToListModal isOpen={isOpen} onClose={onClose} book={book} />
 */
export function AddToListModal({ isOpen, onClose, book }: AddToListModalProps) {
  const [lists, setLists] = useState<ReadingList[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isAdding, setIsAdding] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadLists();
    }
  }, [isOpen]);

  const loadLists = async () => {
    setIsLoading(true);
    try {
      const data = await getReadingLists();
      setLists(data);
    } catch (error) {
      handleApiError(error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddToList = async (list: ReadingList) => {
    // Check if book is already in the list
    if (list.bookIds.includes(book.id)) {
      alert('This book is already in the selected list!');
      return;
    }

    setIsAdding(true);
    try {
      const updatedBookIds = [...list.bookIds, book.id];
      await updateReadingList(list.id, {
        bookIds: updatedBookIds,
        updatedAt: new Date().toISOString(),
      });

      showSuccess(`"${book.title}" added to "${list.name}"!`);
      onClose();
    } catch (error) {
      handleApiError(error);
    } finally {
      setIsAdding(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Add to Reading List">
      <div className="space-y-4">
        {/* Book Info */}
        <div className="flex items-center space-x-4 p-4 bg-slate-50 rounded-lg border">
          <img
            src={book.coverImage}
            alt={book.title}
            className="w-12 h-16 object-cover rounded"
            onError={(e) => {
              e.currentTarget.src = 'https://via.placeholder.com/48x64?text=No+Cover';
            }}
          />
          <div>
            <h4 className="font-semibold text-slate-900">{book.title}</h4>
            <p className="text-sm text-slate-600">by {book.author}</p>
          </div>
        </div>

        {/* Loading State */}
        {isLoading && (
          <div className="flex justify-center py-8">
            <LoadingSpinner size="md" />
          </div>
        )}

        {/* No Lists State */}
        {!isLoading && lists.length === 0 && (
          <div className="text-center py-8">
            <svg
              className="w-12 h-12 text-slate-400 mx-auto mb-4"
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
            <p className="text-slate-600 mb-4">You don't have any reading lists yet.</p>
            <Button variant="primary" onClick={onClose}>
              Create Your First List
            </Button>
          </div>
        )}

        {/* Lists */}
        {!isLoading && lists.length > 0 && (
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {lists.map((list) => {
              const isBookInList = list.bookIds.includes(book.id);

              return (
                <div
                  key={list.id}
                  className={`p-4 border rounded-lg cursor-pointer transition-all ${
                    isBookInList
                      ? 'bg-green-50 border-green-200 cursor-not-allowed'
                      : 'bg-white border-slate-200 hover:border-violet-300 hover:bg-violet-50'
                  }`}
                  onClick={() => !isBookInList && !isAdding && handleAddToList(list)}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-semibold text-slate-900">{list.name}</h4>
                      <p className="text-sm text-slate-600 line-clamp-1">{list.description}</p>
                      <p className="text-xs text-slate-500 mt-1">
                        {list.bookIds.length} book{list.bookIds.length !== 1 ? 's' : ''}
                      </p>
                    </div>
                    <div className="flex items-center">
                      {isBookInList ? (
                        <div className="flex items-center text-green-600">
                          <svg className="w-5 h-5 mr-1" fill="currentColor" viewBox="0 0 20 20">
                            <path
                              fillRule="evenodd"
                              d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                              clipRule="evenodd"
                            />
                          </svg>
                          <span className="text-sm font-medium">Added</span>
                        </div>
                      ) : (
                        <svg
                          className="w-5 h-5 text-slate-400"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M12 6v6m0 0v6m0-6h6m-6 0H6"
                          />
                        </svg>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Actions */}
        <div className="flex justify-end space-x-3 pt-4 border-t">
          <Button variant="secondary" onClick={onClose} disabled={isAdding}>
            Cancel
          </Button>
        </div>
      </div>
    </Modal>
  );
}
