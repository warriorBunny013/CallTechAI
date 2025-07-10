import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    // Test different import methods
    let vapiImport = null
    let error = null

    try {
      const { Vapi } = await import('@vapi-ai/web')
      vapiImport = 'Vapi import successful'
    } catch (e) {
      error = `Vapi import failed: ${e}`
    }

    return NextResponse.json({
      message: 'Vapi import test',
      vapiImport,
      error,
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('Test error:', error)
    return NextResponse.json(
      { error: 'Test failed', details: error },
      { status: 500 }
    )
  }
} 