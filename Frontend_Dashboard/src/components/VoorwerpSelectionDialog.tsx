import { useState, useMemo } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Checkbox } from "@/components/ui/checkbox"
import { ScrollArea } from "@/components/ui/scroll-area"

type Props = {
  classes: { id: number; class_name: string }[]
  selectedClasses: number[]
  toggleClass: (id: number) => void
}

export function ClassSelectionDialog({
  classes,
  selectedClasses,
  toggleClass,
}: Props) {
  const [search, setSearch] = useState("")
  const [open, setOpen] = useState(false)

  // 🔎 Live filtering (applies on every keystroke)
  const filteredClasses = useMemo(() => {
    return classes.filter((cls) =>
      cls.class_name.toLowerCase().includes(search.toLowerCase())
    )
  }, [classes, search])

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">
          Geselecteerde voorwerpen ({selectedClasses.length})
        </Button>
      </DialogTrigger>

      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Select Classes</DialogTitle>
        </DialogHeader>

        {/* 🔎 Search input */}
        <Input
          placeholder="Search class..."
          value={search}
          onChange={(e:any) => setSearch(e.target.value)}
          className="mb-4"
        />

        {/* 📜 Scrollable list */}
        <ScrollArea className="max-h-[300px] pr-4">
          <div className="space-y-3">
            {filteredClasses.map((cls) => (
              <label key={cls.id} className="flex items-center gap-3 cursor-pointer select-none"
>
                <Checkbox
                  checked={selectedClasses.includes(cls.id)}
                  onCheckedChange={() => toggleClass(cls.id)}
                />
                <span className="text-sm">{cls.class_name}</span>
              </label>
            ))}

            {filteredClasses.length === 0 && (
              <p className="text-sm text-muted-foreground">
                No classes found.
              </p>
            )}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  )
}