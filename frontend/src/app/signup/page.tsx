'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { signup } from '@/app/auth/actions'
import { Eye, EyeOff } from 'lucide-react'
import Image from 'next/image'

export default function SignupPage(props: {
    searchParams: Promise<{ error?: string }>
}) {
    const [showPassword, setShowPassword] = useState(false)
    const [params, setParams] = useState<{ error?: string } | null>(null)

    useEffect(() => {
        props.searchParams.then(setParams)
    }, [props.searchParams])

    return (
        <div className="h-screen flex flex-col items-center justify-center bg-slate-950 font-sans relative overflow-hidden">
            {/* Background Logo Watermark */}
            <div className="absolute -right-20 -bottom-20 opacity-5 pointer-events-none grayscale">
                <Image src="/logo.png" alt="" width={600} height={600} />
            </div>

            <div className="w-full max-w-md bg-slate-900/50 backdrop-blur-xl p-8 rounded-2xl shadow-2xl border border-slate-800/50 z-10">
                <div className="text-center mb-8">
                    <div className="w-20 h-20 bg-slate-900 rounded-2xl flex items-center justify-center mb-6 mx-auto shadow-xl ring-1 ring-slate-800 p-2">
                        <Image src="/logo.png" alt="Agflow Logo" width={64} height={64} className="rounded-xl" />
                    </div>
                    <h1 className="text-3xl font-bold text-white tracking-tight">Create an Account</h1>
                    <p className="text-sm text-slate-400 mt-2">Join Agflow today</p>
                </div>

                <form className="flex flex-col gap-5">
                    <div className="space-y-1.5">
                        <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider ml-1">Full Name</label>
                        <input
                            name="fullName"
                            required
                            placeholder="John Doe"
                            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm text-slate-200 placeholder:text-slate-600 focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500 outline-none transition-all shadow-inner"
                        />
                    </div>
                    <div className="space-y-1.5">
                        <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider ml-1">Email Address</label>
                        <input
                            name="email"
                            type="email"
                            required
                            placeholder="name@company.com"
                            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm text-slate-200 placeholder:text-slate-600 focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500 outline-none transition-all shadow-inner"
                        />
                    </div>
                    <div className="space-y-1.5">
                        <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider ml-1">Password</label>
                        <div className="relative">
                            <input
                                name="password"
                                type={showPassword ? "text" : "password"}
                                required
                                placeholder="••••••••"
                                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm text-slate-200 placeholder:text-slate-600 focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500 outline-none transition-all shadow-inner pr-11"
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 text-slate-500 hover:text-slate-300 transition-colors"
                            >
                                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                            </button>
                        </div>
                    </div>

                    {/* Error Message Display */}
                    {params?.error && (
                        <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-xs p-4 rounded-xl flex items-center gap-2">
                            <div className="w-1.5 h-1.5 rounded-full bg-red-500" />
                            {params.error}
                        </div>
                    )}

                    <button
                        formAction={signup}
                        className="w-full bg-purple-600 hover:bg-purple-500 text-white font-semibold py-3.5 rounded-xl transition-all shadow-lg shadow-purple-900/30 hover:shadow-purple-900/50 hover:-translate-y-0.5"
                    >
                        Create Account
                    </button>
                </form>

                <div className="mt-8 text-center text-sm text-slate-500">
                    Already have an account?{' '}
                    <Link href="/login" className="text-purple-400 hover:text-purple-300 font-medium transition-colors">
                        Sign in here
                    </Link>
                </div>
            </div>
        </div>
    )
}