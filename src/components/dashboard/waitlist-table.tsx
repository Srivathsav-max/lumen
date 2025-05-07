"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
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
import { Loader2, Trash2, Search } from "lucide-react";

interface WaitlistEntry {
  id: number;
  email: string;
  name: string;
  status: string;
  notes: string;
  created_at: string;
  updated_at: string;
}

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
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8989/api/v1'}/waitlist`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
        },
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch waitlist entries');
      }
      
      const data = await response.json();
      console.log('Waitlist API response:', data);
      
      // Ensure entries is always an array
      if (Array.isArray(data)) {
        setEntries(data);
      } else if (data.entries && Array.isArray(data.entries)) {
        setEntries(data.entries);
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
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8989/api/v1'}/waitlist/${currentEntry.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
        },
        body: JSON.stringify({
          status: editStatus,
          notes: editNotes,
        }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to update waitlist entry');
      }
      
      toast.success('Waitlist entry updated successfully');
      setIsEditDialogOpen(false);
      
      // Update the entry in the local state
      setEntries(entries.map(entry => 
        entry.id === currentEntry.id 
          ? { ...entry, status: editStatus, notes: editNotes, updated_at: new Date().toISOString() } 
          : entry
      ));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to update waitlist entry');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDelete = async (id: number) => {
    setDeleteId(id);
    setIsDeleting(true);
    
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8989/api/v1'}/waitlist/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
        },
      });
      
      if (!response.ok) {
        throw new Error('Failed to delete waitlist entry');
      }
      
      toast.success('Waitlist entry deleted successfully');
      
      // Remove the entry from the local state
      setEntries(entries.filter(entry => entry.id !== id));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to delete waitlist entry');
    } finally {
      setIsDeleting(false);
      setDeleteId(null);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div className="relative w-64">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            type="text"
            placeholder="Search entries..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 border-2 border-[#333] shadow-[0_4px_0_0_#333] focus:shadow-[0_6px_0_0_#333] focus:border-[#333] transition-all duration-200 font-mono"
          />
        </div>
        <Button 
          onClick={() => fetchWaitlistEntries()} 
          variant="outline"
          disabled={loading}
          className="border-2 border-[#333] shadow-[0_4px_0_0_#333] hover:shadow-[0_6px_0_0_#333] hover:-translate-y-1 transition-all duration-200 font-mono"
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
          Refresh
        </Button>
      </div>
      
      {loading ? (
        <div className="flex justify-center items-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-[#333]" />
        </div>
      ) : filteredEntries.length === 0 ? (
        <div className="text-center p-8 border-2 border-[#333] rounded-lg bg-white shadow-[0_4px_0_0_#333]">
          <p className="text-[#333] font-mono">
            {searchQuery ? "No matching entries found." : "No waitlist entries found."}
          </p>
        </div>
      ) : (
        <div className="border-2 border-[#333] rounded-lg overflow-hidden shadow-[0_4px_0_0_#333]">
          <Table>
            <TableHeader>
              <TableRow className="bg-[#f5f5f5] border-b border-gray-200">
                <TableHead className="font-mono text-[#333] border-r border-gray-200">Email</TableHead>
                <TableHead className="font-mono text-[#333] border-r border-gray-200">Name</TableHead>
                <TableHead className="font-mono text-[#333] border-r border-gray-200">Status</TableHead>
                <TableHead className="font-mono text-[#333] border-r border-gray-200">Joined</TableHead>
                <TableHead className="font-mono text-[#333] border-r border-gray-200">Last Updated</TableHead>
                <TableHead className="text-right font-mono text-[#333]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredEntries.map((entry, index) => (
                <TableRow 
                  key={entry.id} 
                  className={`hover:bg-[#fafafa] border-b border-gray-200 ${index === filteredEntries.length - 1 ? 'border-b-0' : ''}`}
                >
                  <TableCell className="font-mono border-r border-gray-200">{entry.email}</TableCell>
                  <TableCell className="font-mono border-r border-gray-200">{entry.name || "-"}</TableCell>
                  <TableCell className="border-r border-gray-200">
                    <span className={`px-2 py-1 rounded-full text-xs font-mono font-medium ${
                      entry.status === 'pending' ? 'bg-yellow-100 text-yellow-800 border border-yellow-200' :
                      entry.status === 'approved' ? 'bg-green-100 text-green-800 border border-green-200' :
                      entry.status === 'rejected' ? 'bg-red-100 text-red-800 border border-red-200' :
                      'bg-gray-100 text-gray-800 border border-gray-200'
                    }`}>
                      {entry.status}
                    </span>
                  </TableCell>
                  <TableCell className="font-mono border-r border-gray-200">{formatDate(entry.created_at)}</TableCell>
                  <TableCell className="font-mono border-r border-gray-200">{formatDate(entry.updated_at)}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
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
                          <Loader2 className="h-4 w-4 animate-spin" />
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
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
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
