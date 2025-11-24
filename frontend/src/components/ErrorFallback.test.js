import React from 'react';
import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import ErrorFallback from './ErrorFallback';

describe('ErrorFallback 元件測試', () => {
  const mockError = new Error('測試錯誤訊息');
  const mockResetErrorBoundary = jest.fn();

  test('應該渲染 ErrorFallback 元件', () => {
    render(
      <BrowserRouter>
        <ErrorFallback
          error={mockError}
          resetErrorBoundary={mockResetErrorBoundary}
        />
      </BrowserRouter>
    );

    // 檢查主要標題是否存在
    expect(screen.getByText(/糟糕/i)).toBeInTheDocument();
  });

  test('應該顯示錯誤訊息標題', () => {
    render(
      <BrowserRouter>
        <ErrorFallback
          error={mockError}
          resetErrorBoundary={mockResetErrorBoundary}
        />
      </BrowserRouter>
    );

    const heading = screen.getByRole('heading', { level: 1 });
    expect(heading).toBeInTheDocument();
  });

  test('應該顯示操作按鈕', () => {
    render(
      <BrowserRouter>
        <ErrorFallback
          error={mockError}
          resetErrorBoundary={mockResetErrorBoundary}
        />
      </BrowserRouter>
    );

    const buttons = screen.getAllByRole('button');
    expect(buttons.length).toBeGreaterThanOrEqual(2);
  });
});

