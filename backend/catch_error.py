import traceback
try:
    import main
    open('exact_error.txt', 'w').write('Success')
except Exception as e:
    open('exact_error.txt', 'w').write(traceback.format_exc())
