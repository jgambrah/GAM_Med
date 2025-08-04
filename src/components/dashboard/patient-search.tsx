
"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { Search, Loader2, X } from "lucide-react"

import { Input } from "@/components/ui/input"
import type { Patient } from "@/lib/types"
import { allPatients } from "@/lib/data"
import { useDebounce } from "@/hooks/use-debounce"

export function PatientSearchComponent() {
  const router = useRouter()
  const [query, setQuery] = React.useState("")
  const [results, setResults] = React.useState<Patient[]>([])
  const [isLoading, setIsLoading] = React.useState(false)
  const [isFocused, setIsFocused] = React.useState(false)

  const debouncedQuery = useDebounce(query, 300)

  React.useEffect(() => {
    if (debouncedQuery) {
      setIsLoading(true)
      // Simulate API call
      setTimeout(() => {
        const lowercasedQuery = debouncedQuery.toLowerCase().trim()
        const filtered = allPatients.filter(patient => {
          const searchCorpus = [
            patient.fullName.toLowerCase(),
            patient.patientId.toLowerCase(),
            patient.contact.primaryPhone,
            patient.ghanaCardId?.toLowerCase() || ''
          ].join(' ')
          return searchCorpus.includes(lowercasedQuery)
        })
        setResults(filtered)
        setIsLoading(false)
      }, 500) // Simulate network latency
    } else {
      setResults([])
    }
  }, [debouncedQuery])

  const handleResultClick = (patientId: string) => {
    router.push(`/admin/patients/${patientId}`)
  }

  const handleClear = () => {
    setQuery("");
    setResults([]);
  }

  return (
    <div className="relative w-full max-w-lg" onBlur={() => setTimeout(() => setIsFocused(false), 100)}>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => setIsFocused(true)}
          placeholder="Search patients by name, ID, or phone..."
          className="pl-10"
        />
        {isLoading && <Loader2 className="absolute right-10 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin" />}
        {query && !isLoading && (
            <button onClick={handleClear} className="absolute right-3 top-1/2 -translate-y-1/2">
                <X className="h-4 w-4 text-muted-foreground hover:text-foreground" />
            </button>
        )}
      </div>
      {isFocused && (debouncedQuery || results.length > 0) && (
        <div className="absolute z-10 mt-1 w-full rounded-md border bg-card text-card-foreground shadow-lg">
          {results.length > 0 ? (
            <ul className="py-1">
              {results.slice(0, 7).map(patient => (
                <li
                  key={patient.patientId}
                  onMouseDown={(e) => e.preventDefault()} // Prevents onBlur from firing before onClick
                  onClick={() => handleResultClick(patient.patientId)}
                  className="cursor-pointer px-3 py-2 hover:bg-accent"
                >
                  <p className="font-medium">{patient.fullName}</p>
                  <p className="text-sm text-muted-foreground">
                    ID: {patient.patientId} | Phone: {patient.contact.primaryPhone}
                  </p>
                </li>
              ))}
            </ul>
          ) : !isLoading ? (
            <p className="p-4 text-center text-sm text-muted-foreground">No results found.</p>
          ) : null}
        </div>
      )}
    </div>
  )
}
