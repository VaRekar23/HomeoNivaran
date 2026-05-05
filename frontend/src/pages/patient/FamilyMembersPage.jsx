import { useState } from "react"
import { Users, Plus, UserPlus } from "lucide-react"

import FamilyMemberCard from "../../components/patient/FamilyMemberCard"
import FamilyMemberForm from "../../components/patient/FamilyMemberForm"
import Modal from "../../components/ui/Modal"
import ConfirmDialog from "../../components/ui/ConfirmDialog"
import EmptyState from "../../components/ui/EmptyState"
import Button from "../../components/ui/Button"
import { PageSpinner } from "../../components/ui/Spinner"
import {
  useFamilyMembers,
  useCreateFamilyMember,
  useUpdateFamilyMember,
  useDeleteFamilyMember,
} from "../../hooks/useFamilyMembers"

const FamilyMembersPage = () => {
  // Modal state
  const [addOpen, setAddOpen] = useState(false)
  const [editMember, setEditMember] = useState(null)
  const [deleteMember, setDeleteMember] = useState(null)

  // Data + mutations
  const { data, isLoading } = useFamilyMembers()
  const members = Array.isArray(data) ? data : []
  const createMutation = useCreateFamilyMember()
  const updateMutation = useUpdateFamilyMember()
  const deleteMutation = useDeleteFamilyMember()

  // ── Handlers ──
  const handleAdd = async (data) => {
    await createMutation.mutateAsync(data)
    setAddOpen(false)
  }

  const handleEdit = async (data) => {
    await updateMutation.mutateAsync({ id: editMember.id, data })
    setEditMember(null)
  }

  const handleDelete = async () => {
    await deleteMutation.mutateAsync(deleteMember.id)
    setDeleteMember(null)
  }

  if (isLoading) return <PageSpinner />

  return (
    <div className="page-container">

      {/* Page header */}
      <div className="section-header">
        <div>
          <h1 className="text-slate-900 mb-1">Family Members</h1>
          <p className="text-slate-500 text-sm">
            Manage profiles for everyone you want to book consultations for.
          </p>
        </div>
        <Button
          variant="primary"
          onClick={() => setAddOpen(true)}
        >
          <Plus className="w-4 h-4" />
          Add Member
        </Button>
      </div>

      {/* Info banner */}
      <div className="mb-6 bg-blue-50 border border-blue-100 rounded-xl p-4 flex items-start gap-3">
        <Users className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
        <p className="text-sm text-blue-700">
          Add profiles for yourself and your family members. Each profile
          stores age and gender which helps the AI generate more accurate
          clinical questions during consultations.
        </p>
      </div>

      {/* Member grid or empty state */}
      {members.length === 0 ? (
        <EmptyState
          icon={UserPlus}
          title="No family members yet"
          description="Add your first family member to start booking consultations for them."
          action={
            <Button
              variant="primary"
              onClick={() => setAddOpen(true)}
            >
              <Plus className="w-4 h-4" />
              Add First Member
            </Button>
          }
        />
      ) : (
        <>
          {/* Member count */}
          <p className="text-sm text-slate-400 mb-4">
            {members.length} member{members.length !== 1 ? "s" : ""} added
          </p>

          {/* Cards grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {members.map((member) => (
              <FamilyMemberCard
                key={member.id}
                member={member}
                onEdit={setEditMember}
                onDelete={setDeleteMember}
              />
            ))}

            {/* Add new member card */}
            <button
              onClick={() => setAddOpen(true)}
              className="card p-5 border-dashed border-2 border-slate-200 hover:border-primary-300 hover:bg-primary-50/30 transition-all duration-200 flex flex-col items-center justify-center gap-3 min-h-[160px] group"
            >
              <div className="w-12 h-12 bg-slate-100 group-hover:bg-primary-100 rounded-xl flex items-center justify-center transition-colors">
                <Plus className="w-6 h-6 text-slate-400 group-hover:text-primary-600" />
              </div>
              <span className="text-sm font-medium text-slate-400 group-hover:text-primary-600 transition-colors">
                Add Family Member
              </span>
            </button>
          </div>
        </>
      )}

      {/* Add Modal */}
      <Modal
        isOpen={addOpen}
        onClose={() => setAddOpen(false)}
        title="Add Family Member"
      >
        <FamilyMemberForm
          onSubmit={handleAdd}
          onCancel={() => setAddOpen(false)}
          loading={createMutation.isPending}
        />
      </Modal>

      {/* Edit Modal */}
      <Modal
        isOpen={!!editMember}
        onClose={() => setEditMember(null)}
        title="Edit Family Member"
      >
        <FamilyMemberForm
          defaultValues={editMember}
          onSubmit={handleEdit}
          onCancel={() => setEditMember(null)}
          loading={updateMutation.isPending}
        />
      </Modal>

      {/* Delete Confirm Dialog */}
      <ConfirmDialog
        isOpen={!!deleteMember}
        onClose={() => setDeleteMember(null)}
        onConfirm={handleDelete}
        title={`Remove ${deleteMember?.name}?`}
        message="This will deactivate the member profile. Their consultation history will be preserved."
        confirmLabel="Remove Member"
        loading={deleteMutation.isPending}
      />
    </div>
  )
}

export default FamilyMembersPage