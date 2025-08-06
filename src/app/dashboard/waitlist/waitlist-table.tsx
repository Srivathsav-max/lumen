"use client";

import { useState, useEffect } from "react";
import { toast } from "@/providers/notification-provider";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Trash2, Search } from "lucide-react";
import { Spinner } from "@/components/ui/spinner";
import { WaitlistEntry, getWaitlistEntries, updateWaitlistEntry, deleteWaitlistEntry } from "./api";

export function WaitlistTable() {
  const [entries, setEntries] = useState<WaitlistEntry[]>([]);
  const [filteredEntries, setFilteredEntries] = useState<WaitlistEntry[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [currentEntry, setCurrentEntry] = useState<WaitlistEntry | null>(null);
  const [editStatus, setEditStatus] = useState("");
  const [editNotes, setEditNotes] = useState("");
  const [isUpdating, setIsUpdating] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteId, setDeleteId] = useState<number | null>(null);

  const fetchWaitlistEntries = async () => {
    setLoading(true);
    try {
      const data = await getWaitlistEntries();
      console.log('Waitlist API response:', data);
      
      // Set entries from API response
      if (Array.isArray(data)) {
        setEntries(data);
      } else {
        console.error('Unexpected API response format:', data);
        setEntries([]);
      }
    } catch (error) {
      console.error('Error fetching waitlist entries:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to fetch waitlist entries');
      setEntries([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWaitlistEntries();
  }, []);

  // Add search functionality
  useEffect(() => {
    if (searchQuery.trim() === "") {
      setFilteredEntries(entries);
    } else {
      const query = searchQuery.toLowerCase();
      const filtered = entries.filter(entry => 
        entry.email.toLowerCase().includes(query) ||
        (entry.name && entry.name.toLowerCase().includes(query)) ||
        entry.status.toLowerCase().includes(query)
      );
      setFilteredEntries(filtered);
    }
  }, [searchQuery, entries]);

  const handleEdit = (entry: WaitlistEntry) => {
    setCurrentEntry(entry);
    setEditStatus(entry.status);
    setEditNotes(entry.notes || "");
    setIsEditDialogOpen(true);
  };

  const handleUpdate = async () => {
    if (!currentEntry) return;
    
    setIsUpdating(true);
    try {
      // Use the API module function
      await updateWaitlistEntry(currentEntry.id, {
        status: editStatus,
        notes: editNotes,
      });
      
      toast.success('Waitlist entry updated successfully');
      setIsEditDialogOpen(false);
      
      // Refresh the waitlist entries
      fetchWaitlistEntries();
    } catch (error) {
      console.error('Error updating waitlist entry:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to update waitlist entry');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDelete = async (id: number) => {
    setIsDeleting(true);
    setDeleteId(id);
    
    try {
      // Use the API module function
      await deleteWaitlistEntry(id);
      
      toast.success('Waitlist entry deleted successfully');
      
      // Refresh the waitlist entries
      fetchWaitlistEntries();
    } catch (error) {
      console.error('Error deleting waitlist entry:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to delete waitlist entry');
    } finally {
      setIsDeleting(false);
      setDeleteId(null);
    }
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return 'N/A';
    
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      });
    } catch (error) {
      return dateString;
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center space-x-2">
        <div className="relative flex-1">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by email, name, or status..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-8 border-2 border-[#333] shadow-[0_4px_0_0_#333] focus:shadow-[0_6px_0_0_#333] focus:border-[#333] transition-all duration-200 font-mono"
          />
        </div>
        <Button
          onClick={fetchWaitlistEntries}
          disabled={loading}
          className="bg-white text-[#333] border-2 border-[#333] shadow-[0_4px_0_0_#333] hover:shadow-[0_6px_0_0_#333] hover:-translate-y-1 transition-all duration-200 font-mono"
        >
          {loading ? (
            <>
              <Spinner size="sm" className="mr-2" />
              Loading...
            </>
          ) : (
            "Refresh"
          )}
        </Button>
      </div>
      
      {loading ? (
        <div className="flex justify-center items-center h-64">
          <Spinner size="md" />
        </div>
      ) : filteredEntries.length === 0 ? (
        <div className="text-center py-8 border-2 border-[#333] rounded-lg">
          <p className="text-lg font-mono text-[#333]">No waitlist entries found</p>
        </div>
      ) : (
        <div className="border-2 border-[#333] rounded-lg overflow-hidden shadow-[0_4px_0_0_#333]">
          <Table>
            <TableHeader className="bg-[#f5f5f5]">
              <TableRow className="border-b-2 border-[#333]">
                <TableHead className="font-mono font-bold text-[#333]">Email</TableHead>
                <TableHead className="font-mono font-bold text-[#333]">Name</TableHead>
                <TableHead className="font-mono font-bold text-[#333]">Status</TableHead>
                <TableHead className="font-mono font-bold text-[#333]">Created</TableHead>
                <TableHead className="font-mono font-bold text-[#333]">Notes</TableHead>
                <TableHead className="font-mono font-bold text-[#333]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredEntries.map((entry) => (
                <TableRow key={entry.id} className="border-b border-[#333] last:border-b-0">
                  <TableCell className="font-mono">{entry.email}</TableCell>
                  <TableCell className="font-mono">{entry.name || 'N/A'}</TableCell>
                  <TableCell className="font-mono">
                    <span className={`inline-block px-2 py-1 rounded-full text-xs font-bold ${
                      entry.status === 'approved' 
                        ? 'bg-green-100 text-green-800' 
                        : entry.status === 'rejected'
                        ? 'bg-red-100 text-red-800'
                        : 'bg-yellow-100 text-yellow-800'
                    }`}>
                      {entry.status.charAt(0).toUpperCase() + entry.status.slice(1)}
                    </span>
                  </TableCell>
                  <TableCell className="font-mono">{formatDate(entry.created_at)}</TableCell>
                  <TableCell className="font-mono max-w-[200px] truncate">
                    {entry.notes || 'N/A'}
                  </TableCell>
                  <TableCell>
                    <div className="flex space-x-2">
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => handleEdit(entry)}
                        className="border-2 border-[#333] shadow-[0_2px_0_0_#333] hover:shadow-[0_4px_0_0_#333] hover:-translate-y-1 transition-all duration-200 font-mono"
                      >
                        Edit
                      </Button>
                      <Button 
                        variant="destructive" 
                        size="sm"
                        onClick={() => handleDelete(entry.id)}
                        disabled={isDeleting && deleteId === entry.id}
                        className="border-2 border-red-600 shadow-[0_2px_0_0_#333] hover:shadow-[0_4px_0_0_#333] hover:-translate-y-1 transition-all duration-200 font-mono"
                      >
                        {isDeleting && deleteId === entry.id ? (
                          <Spinner size="sm" />
                        ) : (
                          <Trash2 className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
      
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="bg-white border-2 border-[#333] shadow-[0_8px_0_0_#333] rounded-lg">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold font-mono text-[#333]">
              Edit Waitlist Entry
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-mono font-medium text-[#333]">
                Status
              </label>
              <Select value={editStatus} onValueChange={setEditStatus}>
                <SelectTrigger className="border-2 border-[#333] shadow-[0_4px_0_0_#333] focus:shadow-[0_6px_0_0_#333] focus:border-[#333] transition-all duration-200 font-mono">
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent className="bg-white border-2 border-[#333] shadow-[0_4px_0_0_#333]">
                  <SelectItem value="pending" className="font-mono">Pending</SelectItem>
                  <SelectItem value="approved" className="font-mono">Approved</SelectItem>
                  <SelectItem value="rejected" className="font-mono">Rejected</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-mono font-medium text-[#333]">
                Notes
              </label>
              <Textarea
                value={editNotes}
                onChange={(e) => setEditNotes(e.target.value)}
                className="border-2 border-[#333] shadow-[0_4px_0_0_#333] focus:shadow-[0_6px_0_0_#333] focus:border-[#333] transition-all duration-200 font-mono min-h-[100px]"
                placeholder="Add any notes about this entry..."
              />
            </div>
          </div>
          
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsEditDialogOpen(false)}
              className="border-2 border-[#333] shadow-[0_4px_0_0_#333] hover:shadow-[0_6px_0_0_#333] hover:-translate-y-1 transition-all duration-200 font-mono"
            >
              Cancel
            </Button>
            <Button
              onClick={handleUpdate}
              disabled={isUpdating}
              className="bg-white text-[#333] border-2 border-[#333] shadow-[0_4px_0_0_#333] hover:shadow-[0_6px_0_0_#333] hover:-translate-y-1 transition-all duration-200 font-mono"
            >
              {isUpdating ? (
                <>
                  <Spinner size="sm" className="mr-2" />
                  Updating...
                </>
              ) : (
                "Update Entry"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
