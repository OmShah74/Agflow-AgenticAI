import Link from 'next/link'
import { login } from '@/app/auth/actions'

export default async function LoginPage(props: {
    searchParams: Promise<{ message?: string; error?: string }>
}) {
  const searchParams = await props.searchParams

  return (
    <div className="h-screen flex flex-col items-center justify-center bg-slate-50">
        <div className="w-full max-w-md bg-white p-8 rounded-lg shadow-md border border-gray-200">
            <div className="text-center mb-8">
                <h1 className="text-2xl font-bold text-gray-900">Welcome Back</h1>
                <p className="text-sm text-gray-600">Sign in to continue to OpenFlow</p>
            </div>

            <form className="flex flex-col gap-4">
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                    <input 
                        name="email" 
                        type="email" 
                        required 
                        placeholder="you@example.com"
                        className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                        suppressHydrationWarning={true} // <--- ADD THIS
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
                    <input 
                        name="password" 
                        type="password" 
                        required 
                        placeholder="••••••••"
                        className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                        suppressHydrationWarning={true} // <--- ADD THIS
                    />
                </div>

                {/* Messages Display */}
                {searchParams?.message && (
                    <div className="bg-green-50 text-green-700 text-sm p-3 rounded">
                        {searchParams.message}
                    </div>
                )}
                {searchParams?.error && (
                    <div className="bg-red-50 text-red-600 text-sm p-3 rounded">
                        {searchParams.error}
                    </div>
                )}

                <button 
                    formAction={login} 
                    className="w-full bg-slate-900 hover:bg-slate-800 text-white font-medium py-2 rounded transition-colors"
                    suppressHydrationWarning={true} // <--- ADD THIS
                >
                    Sign In
                </button>
            </form>

            <div className="mt-6 text-center text-sm text-gray-600">
                Don't have an account?{' '}
                <Link href="/signup" className="text-blue-600 hover:underline">
                    Sign up
                </Link>
            </div>
        </div>
    </div>
  )
}