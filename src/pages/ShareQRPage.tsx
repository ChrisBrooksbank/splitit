import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, AlertTriangle } from 'lucide-react'
import { QRCodeSVG } from 'qrcode.react'
import { useBillStore } from '../store/billStore'
import { usePeopleStore } from '../store/peopleStore'
import { useAssignmentStore } from '../store/assignmentStore'
import { useTipStore } from '../store/tipStore'
import { encodeForQR, getQRByteCount, BillTooLargeError } from '../services/qr/qrCodec'

export default function ShareQRPage() {
  const navigate = useNavigate()
  const { lineItems } = useBillStore()
  const { people } = usePeopleStore()
  const { assignments, portions } = useAssignmentStore()
  const { personTips } = useTipStore()

  const [qrData, setQrData] = useState<string | null>(null)
  const [byteCount, setByteCount] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false

    async function encode() {
      try {
        const data = await encodeForQR(lineItems, people, assignments, portions, personTips)
        if (cancelled) return
        setQrData(data)
        setByteCount(getQRByteCount(data))
      } catch (err) {
        if (cancelled) return
        if (err instanceof BillTooLargeError) {
          setError(`Bill too large for QR code (${err.byteCount} bytes, max ${err.maxBytes})`)
        } else {
          setError('Failed to generate QR code')
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    encode()
    return () => {
      cancelled = true
    }
  }, [lineItems, people, assignments, portions, personTips])

  return (
    <div className="min-h-screen bg-white dark:bg-gray-900 flex flex-col">
      {/* Header */}
      <div className="px-4 pt-4 pb-4 flex items-center gap-3">
        <button
          onClick={() => navigate(-1)}
          className="w-10 h-10 flex items-center justify-center rounded-xl bg-gray-100 dark:bg-gray-800 active:scale-95 transition-transform"
          aria-label="Go back"
        >
          <ArrowLeft size={20} className="text-gray-700 dark:text-gray-300" />
        </button>
        <h1 className="text-2xl font-semibold tracking-tight text-gray-900 dark:text-gray-100">
          Share via QR
        </h1>
      </div>

      {/* Content */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 pb-12">
        {loading && (
          <div className="flex flex-col items-center gap-3">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-gray-200 dark:border-gray-700 border-t-gray-800 dark:border-t-gray-200" />
            <p className="text-sm text-gray-500 dark:text-gray-400">Generating QR code...</p>
          </div>
        )}

        {error && (
          <div className="text-center max-w-sm">
            <AlertTriangle size={48} className="mx-auto text-amber-500 mb-4" />
            <p className="text-base font-medium text-gray-900 dark:text-gray-100 mb-2">
              Cannot generate QR code
            </p>
            <p className="text-sm text-gray-600 dark:text-gray-400">{error}</p>
            <p className="text-sm text-gray-500 dark:text-gray-500 mt-4">
              Try removing some items or using shorter names.
            </p>
          </div>
        )}

        {qrData && (
          <div className="flex flex-col items-center gap-6">
            <p className="text-sm text-gray-600 dark:text-gray-400 text-center max-w-xs">
              Show this QR code to another phone running SplitIt to share the bill.
            </p>

            <div className="bg-white p-4 rounded-2xl shadow-lg">
              <QRCodeSVG value={qrData} size={256} level="M" includeMargin={false} />
            </div>

            <div className="text-center">
              <p className="text-xs text-gray-400 dark:text-gray-500 tabular-nums">
                {byteCount} / 2,900 bytes
              </p>
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                {lineItems.length} item{lineItems.length !== 1 ? 's' : ''}, {people.length}{' '}
                {people.length !== 1 ? 'people' : 'person'}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
