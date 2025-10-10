import LatePostUpload from '@/components/LatePostUpload'

export const metadata = {
  title: 'Poster en retard',
}

export default function LatePostPage() {
  return (
    <div className="container-padded">
      <div className="py-6">
        <div className="mb-6">
          <h1 className="text-3xl font-extrabold text-red-700">C'EST TROP TARD</h1>
          <p className="text-red-600">Tu peux toujours poster en retard, mais sache que c'est mal. Vraiment mal.</p>
        </div>

        <LatePostUpload />
      </div>
    </div>
  )
}
